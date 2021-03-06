import { AlbumModel } from '../model/AlbumModel.js';
import Resize from '../resize.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { handleError } from './PhotoController.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_LENGTH_TITLE = 140;
const MAX_LENGTH_DESCRIPTION = 300;
const START_PAGE = 1;
const ACTIVE_PAGE = 2;
const END_PAGE = 3;
export const paging = (page, maxPage) => {
  let pageActives = [];
  if (page === START_PAGE && maxPage > ACTIVE_PAGE) {
    pageActives = [
      { page: START_PAGE, active: "page-active" },
      { page: ACTIVE_PAGE, active: "" },
      { page: END_PAGE, active: "" },
    ];
  }
  if (page === START_PAGE && maxPage === ACTIVE_PAGE) {
    pageActives = [
      { page: START_PAGE, active: "page-active" },
      { page: ACTIVE_PAGE, active: "" },
    ];
  }
  if (page === START_PAGE && maxPage === START_PAGE) {
    pageActives = [{ page: START_PAGE, active: "page-active" }];
  }
  if (page === ACTIVE_PAGE && maxPage < END_PAGE) {
    return (pageActives = [
      { page: START_PAGE, active: "" },
      { page: ACTIVE_PAGE, active: "page-active" },
    ]);
  }
  if (page > START_PAGE && page < maxPage) {
    pageActives = [
      { page: page - 1, active: "" },
      { page: page, active: "page-active" },
      { page: page + 1, active: "" },
    ];
  }
  if (page > ACTIVE_PAGE && page === maxPage) {
    pageActives = [
      { page: maxPage - 2, active: "" },
      { page: maxPage - 1, active: "" },
      { page: maxPage, active: "page-active" },
    ];
  }
  return pageActives;
};
export const deleteImage = (body, items) => {
  for (const item of items) {
    if (!body.includes(item)) {
      fs.unlinkSync(`public/${item}`);
    }
  }
};
export const AlbumController = {
  add: async (req, res) => {
    try {
      const { title, description, isPublic } = req.body;
      if (title.length > MAX_LENGTH_TITLE) {
        return handleError(
          res,
          "albums/addAlbum",
          "Title maximum 140 characters long",
          req.body,
          "album",
          req.user
        );
      }
      if (description.length > MAX_LENGTH_DESCRIPTION) {
        return handleError(
          res,
          "albums/addAlbum",
          "Description maximum 300 characters long",
          req.body,
          "album",
          req.user
        );
      }
      if (!req.files.length) {
        return handleError(
          res,
          "albums/addAlbum",
          "Please provide an image",
          req.body,
          "album",
          req.user
        );
      }
      const imagePath = path.join(__dirname, "../public/albums");
      const fileUpload = new Resize(imagePath);
      const images = [];
      for (const item of req.files) {
        images.push("albums/" + (await fileUpload.save(item.buffer)));
      }
      const newAlbum = new AlbumModel({
        title: title,
        description: description,
        images: images,
        isPublic: isPublic,
        user: req.user._id,
      });
      await newAlbum.save();
      return res.status(200).render("albums/addAlbum", {
        mess: "Add Successfully!!!",
        album: req.body,
        user: req.user
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  },
  getAll: async (req, res) => {
    const page = parseInt(req.query.page);
    const pageSize = 20;
    const skipIndex = (page - 1) * pageSize;
    const result = {
      albums: [],
      numberOfResult: "",
    };
    try {
      if (!page) {
        return res.status(200).redirect("/albums?page=1");
      }
      result.albums = await AlbumModel.find();
      if (result.albums.length < 1) {
        return res.status(400).render("albums/myAlbums", {
          pageActives: [],
          preCheck: true,
          nextCheck: true,
          user: req.user,
        });
      }
      result.numberOfResult = result.albums.length;
      result.albums = await AlbumModel.find({ user: req.user._id })
        .limit(pageSize)
        .skip(skipIndex);
      const maxPage = Math.ceil(result.numberOfResult / pageSize);
      if (page > maxPage) {
        return res.status(200).redirect("/albums?page=1");
      }
      let preCheck = page === START_PAGE;
      let nextCheck = page === maxPage;
      return res.status(200).render("albums/myAlbums", {
        albums: result.albums,
        pageActives: paging(page, maxPage),
        preCheck: preCheck,
        nextCheck: nextCheck,
        user: req.user,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  },
  getViewEdit: async (req, res) => {
    try {
      const album = await AlbumModel.findById(req.params.id);
      return res.status(200).render("albums/editAlbum", {
        album: album,
        user: req.user,
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  },
  update: async (req, res) => {
    try {
      const album = await AlbumModel.findById(req.params.id);
      const { title, description, isPublic } = req.body;
      if (title.length > MAX_LENGTH_TITLE) {
        return handleError(
          res,
          "albums/editAlbum",
          "Title maximum 140 characters long",
          album,
          "album",
          req.user
        );
      }
      if (description.length > MAX_LENGTH_DESCRIPTION) {
        return handleError(
          res,
          "albums/editAlbum",
          "Description maximum 300 characters long",
          album,
          "album",
          req.user
        );
      }
      if (!req.body.imageOld && !req.files.length) {
        return handleError(
          res,
          "albums/editAlbum",
          "Must have at least an image",
          album,
          "album",
          req.user
        );
      }
      if (!req.files.length) {
        deleteImage(req.body.imageOld, album.images);
        const albumUpdate = {
          title: title,
          description: description,
          isPublic: isPublic,
          images: req.body.imageOld,
        };
        await album.updateOne({ $set: albumUpdate });
        return res.status(200).render("albums/editAlbum", {
          mess: "Update Successfully!!!",
          album: await AlbumModel.findById(req.params.id),
          user: req.user
        });
      }
      const imagePath = path.join(__dirname, "../public/albums");
      const fileUpload = new Resize(imagePath);
      let images = [];
      for (const item of req.files) {
        images.push("albums/" + (await fileUpload.save(item.buffer)));
      }
      if (req.body.imageOld && typeof req.body.imageOld !== "string") {
        deleteImage(req.body.imageOld, album.images);
        images = req.body.imageOld.concat(images);
      }
      if (req.body.imageOld && typeof req.body.imageOld === "string") {
        deleteImage(req.body.imageOld, album.images);
        images.unshift(req.body.imageOld);
      }
      if(!req.body.imageOld){
        for (const item of album.images) {
          fs.unlinkSync(`public/${item}`);
        }
      }
      const albumUpdate = {
        title: title,
        description: description,
        isPublic: isPublic,
        images: images,
      };
      await album.updateOne({ $set: albumUpdate });
      return res.status(200).render("albums/editAlbum", {
        mess: "Update Successfully!!!",
        album: await AlbumModel.findById(req.params.id),
        user: req.user
      });
    } catch (error) {
      return res.status(400).json(error);
    }
  },
  delete: async (req, res) => {
    try {
      const album = await AlbumModel.findById(req.params.id);
      for (const item of album.images) {
        fs.unlinkSync(`public/${item}`);
      }
      await AlbumModel.findByIdAndDelete(req.params.id);
      return res.redirect("/albums");
    } catch (error) {
      return res.status(400).json(error);
    }
  },
};
