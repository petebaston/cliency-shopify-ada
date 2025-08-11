const express = require('express');
const router = express.Router();

router.post('/app/uninstalled', async (req, res) => {
  console.log('App uninstalled webhook received');
  res.status(200).send('OK');
});

router.post('/orders/create', async (req, res) => {
  console.log('Order created webhook received');
  res.status(200).send('OK');
});

router.post('/orders/updated', async (req, res) => {
  console.log('Order updated webhook received');
  res.status(200).send('OK');
});

router.post('/subscription_contracts/create', async (req, res) => {
  console.log('Subscription contract created webhook received');
  res.status(200).send('OK');
});

router.post('/subscription_contracts/update', async (req, res) => {
  console.log('Subscription contract updated webhook received');
  res.status(200).send('OK');
});

module.exports = router;