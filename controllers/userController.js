import asyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import User from "../models/userModel.js";
import formidable from "formidable";
import fs from "fs";
import _ from "lodash";

// support function

function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}

//
// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;

  form.parse(req, (err, fields, file) => {
    if (err) {
      return res.status(400).json({
        error: "problem with images",
      });
    }

    // destructure fields
    const { name, email, password, isAdmin } = fields;

    // restriction on fields
    let user = new User(fields);

    // handel file here
    if (file.profilePhoto) {
      if (file.profilePhoto.size > 9000000) {
        return res.status(400).json({
          error: "images size too big",
        });
      }
      user.profilePhoto.data = fs.readFileSync(file.profilePhoto.filepath);
      user.profilePhoto.contentType = file.profilePhoto.mimetype;
    }

    const userCreated = User.create({
      name,
      email,
      password,
      isAdmin,
      profilePhoto: user.profilePhoto,
    });

    // saving into database
    if (userCreated) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhoto: user.profilePhoto,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  });
};

const photo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user.profilePhoto.data) {
    // const x = user.profilePhoto.data.toString("base64");
    res.set("Content-Type", user.profilePhoto.contentType);
    return res.send(user.profilePhoto.data);
  } else {
    res.status(404);
    throw new Error("User photo not found");
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;

  form.parse(req, (err, fields, file) => {
    if (err) {
      return res.status(400).json({
        error: "problem with images",
      });
    }

    // destructure fields
    const { name, email, password, isAdmin } = fields;
    const profilePhoto = {};
    // handel file here
    if (file.profilePhoto) {
      if (file.profilePhoto.size > 9000000) {
        return res.status(400).json({
          error: "images size too big",
        });
      }
      profilePhoto.data = fs.readFileSync(file.profilePhoto.filepath);
      profilePhoto.contentType = file.profilePhoto.mimetype;
    }
    const user = req.user;

    user.name = name || req.user.name;
    user.email = email || req.user.email;

    if (password) {
      user.password = password;
    }
    if (!isEmpty(profilePhoto)) {
      user.profilePhoto = profilePhoto;
    }
    user
      .save()
      .then(() => {
        res.json(user);
      })
      .catch(() => {
        res.status(404);
        throw new Error("User not found");
      });
  });
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password").select("-profilePhoto");
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.remove();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .select("-profilePhoto");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  photo,
};
