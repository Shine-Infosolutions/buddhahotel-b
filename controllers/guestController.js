const Guest = require('../models/Guest');
const { cloudinary } = require('../config/cloudinary');

exports.getGuests = async (req, res) => {
  try {
    const guests = await Guest.find();
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createGuest = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, ...data } = req.body;
    if (req.files) {
      if (req.files.guestPhoto) data.guestPhoto = req.files.guestPhoto[0].path;
      if (req.files.idProofPhotos) data.idProofPhotos = req.files.idProofPhotos.map(f => f.path);
    }
    const guest = await Guest.create(data);
    res.status(201).json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGuest = async (req, res) => {
  try {
    const { _id, __v, createdAt, updatedAt, existingIdProofPhotos, ...data } = req.body;
    // Strip empty date strings to avoid cast errors
    ['dateOfBirth', 'anniversaryDate'].forEach((f) => {
      if (!data[f] || data[f] === 'null' || data[f] === '') delete data[f];
    });
    const existingGuest = await Guest.findById(req.params.id);
    if (!existingGuest) return res.status(404).json({ message: 'Guest not found' });
    
    if (req.files) {
      if (req.files.guestPhoto) {
        if (existingGuest.guestPhoto) {
          const publicId = existingGuest.guestPhoto.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId).catch(() => {});
        }
        data.guestPhoto = req.files.guestPhoto[0].path;
      }
      if (req.files.idProofPhotos) {
        const newPhotos = req.files.idProofPhotos.map(f => f.path);
        const keepPhotos = existingIdProofPhotos ? JSON.parse(existingIdProofPhotos) : [];
        data.idProofPhotos = [...keepPhotos, ...newPhotos];
        
        // Delete removed photos from Cloudinary
        const removedPhotos = (existingGuest.idProofPhotos || []).filter(p => !keepPhotos.includes(p));
        for (const photo of removedPhotos) {
          const publicId = photo.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId).catch(() => {});
        }
      } else if (existingIdProofPhotos) {
        data.idProofPhotos = JSON.parse(existingIdProofPhotos);
        const removedPhotos = (existingGuest.idProofPhotos || []).filter(p => !data.idProofPhotos.includes(p));
        for (const photo of removedPhotos) {
          const publicId = photo.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId).catch(() => {});
        }
      }
    } else if (existingIdProofPhotos) {
      data.idProofPhotos = JSON.parse(existingIdProofPhotos);
      const removedPhotos = (existingGuest.idProofPhotos || []).filter(p => !data.idProofPhotos.includes(p));
      for (const photo of removedPhotos) {
        const publicId = photo.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    }
    
    const guest = await Guest.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: false });
    res.json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteGuest = async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Guest not found' });
    
    if (guest.guestPhoto) {
      const publicId = guest.guestPhoto.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    if (guest.idProofPhotos && guest.idProofPhotos.length > 0) {
      for (const photo of guest.idProofPhotos) {
        const publicId = photo.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    }
    
    await Guest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Guest deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
