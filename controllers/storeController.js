const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

// where the file be stored once uploaded, and what kind of files are allowed
const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      // first parameter of next is err, null means move along
      next(null, true);
    } else {
      next({ message: `That filetype is not allowed.`}, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'} );
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if(!req.file) {
    next(); // skip to the next middleware
    return;
  }
  console.log(req.file);
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  await store.save()
  // flash examples: 'success', 'fail', 'warning', 'info'
  req.flash('success', `Successfully created <strong>${store.name}</strong>. Care to leave a review?`);
  res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // query the database for list of all stores
  const stores = await Store.find();
  // pass the data to our template
  res.render('stores', { title: 'Stores', stores: stores });
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug : req.params.slug });
  if(!store) return next();
  res.render('store', { store, title: `${store.name}` });
}

exports.getStoresByTag = async (req, res, next) => {
  const tag = req.params.tag;
  // if no specific tag is selected, show all restaurants that have any tag
  const tagQuery = tag ||  { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  // const tags = ['hey', 'woah', 'tags'];
  res.render('tags', { tags, stores, tag, title: `Search By Tags` })
}

exports.editStore = async (req, res) => {
  // 1. find the store given the id
  const store = await Store.findOne({ _id: req.params.id });
  // 2. confirm they are the owner of the store
  // TODO
  // 3. Render out the edit form so the user can update
  res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
  // set the location data to be a Point
  req.body.location.type = 'Point';
  // find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store instead of old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store ➡</a>`);
  // redirect them to the store and tell them it worked
  res.redirect(`/stores/${store.id}/edit`);
}
