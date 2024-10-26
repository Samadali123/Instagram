const userModel = require("../models/user.model")
const HighlightModel = require("../models/highlights.model")



exports.addHighlightPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("myStories")
        res.render("highlights", { footer: true, loginuser })

    } catch (error) {
        // res.status(500).json({ error })
        res.status(500).render("server")
    }
}

exports.addHighlightsNextPage = async (req, res, next) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email })

        const idsArray = req.params.Ids.split(",")
        if (idsArray.length > 0) {
            // Assuming you have a Story model to find the stories by their IDs
            const stories = await storyModel.find({ _id: { $in: idsArray } });

            if (stories.length > 0) {
                const cover = stories[0].image; // Assuming each story has an 'image' field

                res.render("next", { footer: true, loginuser, cover, ids: idsArray });
            } else {
                res.status(404).json({ error: "No stories found for the user" });
            }
        } else {
            // res.status(400).json({ error: "No IDs provided" });
            res.status(500).render("server")
        }
    } catch (error) {
        // res.status(500).json({ error });
        res.status(500).render("server")
    }
}



exports.addHighlightCoverphoto  = async (req, res) => {
    try {
        // Ensure the user is authenticated
        const loginuser = await userModel.findOne({ email: req.user.email });

        // Extract ids and title from request body
        let { ids, title } = req.body;
        title = title || "Untitled";

        // Ensure ids is an array
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "Invalid 'ids' format. It should be an array." });
        }
        // Trim any extra spaces from the IDs
        ids = ids.map(id => id.trim());

        // Fetch all stories for the ids
        const storiesPromises = ids.map(async (id) => {
            try {
                const story = await storyModel.findById(id);
                if (!story) {
                    console.error(`Story not found for id: ${id}`);
                    return null;
                }
                return story;
            } catch (err) {
                console.error(`Error fetching story with id ${id}:`, err);
                return null;
            }
        });

        // Await all story fetch promises
        const stories = await Promise.all(storiesPromises);

        // Filter out any null values in case any stories were not found
        const filteredStories = stories.filter(story => story !== null);

        // Create new highlight with fetched stories
        const newhighlight = await HighlightModel.create({
            title,
            user: loginuser._id,
            coverphoto: req.params.cover,
            stories: filteredStories,
        });

        loginuser.highlights.push(newhighlight._id)
        newhighlight.populate("stories")
        await newhighlight.save();

        await loginuser.save();
        // console.log(newhighlight.stories)
        req.flash("success", "Highlight created Successfully.")

        const message = req.flash("success")
        res.json({ message });
    } catch (error) {
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}


exports.viewHighlightsPage =  async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });

        // Fetch the highlight and populate the stories array
        const highlight = await HighlightModel.findById(req.params.highlightId);

        // Ensure highlight exists and the stories array has the element at the specified index
        if (highlight && highlight.stories.length > req.params.number) {
            let highlightimage = highlight.stories[req.params.number].image;

            res.render("viewhighlights", {
                footer: false,
                highlightimage,
                loginuser,
                number: req.params.number,
            });
        } else {
            // Redirect to profile if no further stories are available
            res.redirect("/profile");
        }
    } catch (error) {
        // Handle errors by returning a 500 status code and the error message
        // res.status(500).json({ error: error.message });
        res.status(500).render("server")
    }
}