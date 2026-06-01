const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const User = require("./models/User");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
let currentUser = null;

mongoose.connect(
    "mongodb+srv://ecommerceadmin:ronak1148@cluster0.y7u3elo.mongodb.net/socialmedia?retryWrites=true&w=majority&appName=Cluster0"
)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log(err);
});

app.get("/", async (req,res)=>{

    const posts = await Post.find()
    .populate("userId")
    .sort({ createdAt: -1 });

    let postsHTML = "";

    for(const post of posts){

        const comments = await Comment.find({
    postId: post._id
}).populate("userId");

        let commentsHTML = "";

        comments.forEach(comment => {

    commentsHTML += `
        <p>💬 <b>${comment.userId.name}</b>: ${comment.text}</p>
    `;

});

        postsHTML += `
    <div style="border:1px solid black;padding:10px;margin:10px;">

        <h3>${post.userId.name}</h3>

        <p>${post.content}</p>

                <form action="/like" method="POST">

                    <input
                        type="hidden"
                        name="postId"
                        value="${post._id}"
                    >

                    <button type="submit">
                        ❤️ Like (${post.likes.length})
                    </button>

                </form>

                <br>

                <form action="/comment" method="POST">

                    <input
                        type="hidden"
                        name="postId"
                        value="${post._id}"
                    >

                    <input
                        type="text"
                        name="text"
                        placeholder="Write Comment"
                        required
                    >

                    <button type="submit">
                        Comment
                    </button>

                </form>

                ${commentsHTML}

                <hr>

            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mini Social Media</title>
        </head>
        <body>

            <h1>Mini Social Media App</h1>

            <a href="/register">Register</a>
<a href="/login">Login</a>
<a href="/profile">Profile</a>

            <hr>

            <h2>Follow User</h2>

<form action="/follow" method="POST">

    <input
    type="text"
    name="targetUserName"
    placeholder="Enter Username"
    required
>

    <button type="submit">
        Follow
    </button>

</form>

            <h2>Create Post</h2>

            <form action="/create-post" method="POST">

                <textarea
                    name="content"
                    rows="5"
                    cols="50"
                    placeholder="What's on your mind?"
                    required
                ></textarea>

                <br><br>

                <button type="submit">
                    Create Post
                </button>

            </form>

            <hr>

            <h2>Posts Feed</h2>

            ${postsHTML}

        </body>
        </html>
    `);
});

app.get("/register",(req,res)=>{
    res.sendFile(path.join(__dirname,"views","register.html"));
});

app.get("/login",(req,res)=>{
    res.sendFile(path.join(__dirname,"views","login.html"));
});

/* REGISTER */

app.post("/register", async (req,res)=>{

    const { name,email,password } = req.body;

    const user = new User({
        name,
        email,
        password
    });

    await user.save();

    res.redirect("/login");
});

/* LOGIN */

app.post("/login", async (req,res)=>{

    const { email,password } = req.body;

    const user = await User.findOne({
        email,
        password
    });

    if(user){

        currentUser = user;

        console.log("Logged In User:", user);

        res.redirect("/");
    }
    else{
        res.send("Invalid Credentials");
    }
});

/* CREATE POST */

app.post("/create-post", async (req,res)=>{

    const { content } = req.body;

    if(!currentUser){
    return res.send("Please Login First");
}

const post = new Post({
    userId: currentUser._id,
    content
});

    await post.save();

    res.redirect("/");
});
/* GET POSTS */

app.get("/posts", async (req,res)=>{

    const posts = await Post.find();

    res.json(posts);
});

/* COMMENT */

app.post("/comment", async (req,res)=>{

    const { postId, text } = req.body;

    if(!currentUser){
        return res.send("Please Login First");
    }

    const comment = new Comment({
        postId,
        userId: currentUser._id,
        text
    });

    await comment.save();

    res.redirect("/");
});

/* LIKE */

app.post("/like", async (req,res)=>{

    const { postId } = req.body;

    if(!currentUser){
        return res.send("Please Login First");
    }

    await Post.findByIdAndUpdate(
        postId,
        {
            $addToSet:{
                likes: currentUser._id
            }
        }
    );

    res.redirect("/");
});

/* FOLLOW */

app.post("/follow", async (req,res)=>{

    const { targetUserName } = req.body;

    if(!currentUser){
        return res.send("Please Login First");
    }

    const targetUser = await User.findOne({
        name: targetUserName
    });

    if(!targetUser){
        return res.send("User Not Found");
    }

    await User.findByIdAndUpdate(
        currentUser._id,
        {
            $addToSet:{
                following: targetUser._id
            }
        }
    );

    await User.findByIdAndUpdate(
        targetUser._id,
        {
            $addToSet:{
                followers: currentUser._id
            }
        }
    );

    res.redirect("/profile");
});


app.get("/profile", async (req,res)=>{

    if(!currentUser){
        return res.send("Please Login First");
    }

    const user = await User.findById(currentUser._id);

    res.send(`
        <h1>${user.name}</h1>

        <p>${user.email}</p>

        <p>${user.bio}</p>

        <h3>Followers: ${user.followers.length}</h3>

        <h3>Following: ${user.following.length}</h3>

        <a href="/">Home</a>
    `);
});


app.listen(3000,()=>{
    console.log("Server Started");
});

