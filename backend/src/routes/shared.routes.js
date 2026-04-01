const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Categories (accessible to all authenticated users)
router.get('/categories', userController.getCategories);

// Users list (for workflow builder - to select approvers)
router.get('/users', userController.getUsers);

module.exports = router;
