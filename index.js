const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const generateUUID = require('uuid/v4');

const app = express();

app.use(bodyParser.json({ type: 'application/json' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const APP_ROOT = process.env.APP_ROOT;

if (!APP_ROOT) {
  throw new Error("APP_ROOT not exist");
}

const CLIENT_ID = process.env.CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("CLIENT_ID not exist");
}
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_SECRET) {
  throw new Error("CLIENT_SECRET not exist");
}

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error("PORT not exist");
}

const accessTokens = {};
const usersData = {};

function getTokenByReq(req) {
  return req.cookies.token || req.query.token;
}

app.get('/auth/login', (req, res) => {
  return res.redirect(`https://www.facebook.com/v5.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${APP_ROOT}auth/code&state=${generateUUID()}`);
});

app.get('/auth/code', async (req, res) => {
  const {
    code,
    state
  } = req.query;

  const { data: result } = await axios.get(`https://graph.facebook.com/v5.0/oauth/access_token?code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${APP_ROOT}auth/code`);

  accessTokens[state] = result.access_token;

  const { data: user } = await axios.get(`https://graph.facebook.com/v5.0/me?access_token=${result.access_token}`).catch(console.error);

  usersData[state] = user;

  res.cookie('token', state);

  return res.redirect('/?token=' + state);
});

app.get('/auth/me', async (req, res) => {
  const token = getTokenByReq(req);

  if (!token) {
    return res.status(401).json({
      error: "No token"
    });
  }

  const user = usersData[token];

  return res.json({
    token,
    ...user
  });
});

async function getUserGroups(next = null, groups = []) {
  if (!next) {
    return groups;
  }

  const {
    data: result,
    error
  } = await axios.get(next).catch(error => ({ error }));

  if (error) {
    console.error(">>> getUserGroups error", error);
    return groups;
  }

  return getUserGroups(result.paging.next, [
    ...groups,
    ...result.data
  ]);
}

app.get('/api/groups', async (req, res) => {
  const token = getTokenByReq(req);

  if (!token) {
    return res.status(401).json({
      error: "No token"
    });
  }

  const access_token = accessTokens[token];
  const user = usersData[token];

  const {
    data: result,
    error
  } = await axios.get(`https://graph.facebook.com/v5.0/${user.id}/groups?access_token=${access_token}`).catch(error => ({ error }));

  console.log(">>> more groups", result);

  if (error) {
    console.error(">>> api/groups error", error);

    return res.status(400).json({
      message: error.message
    });
  }

  if (!result || !result.paging) {
    console.error(">>> api/groups no result", result);

    return res.status(400).json({
      message: 'no results'
    });
  }

  const groups = await getUserGroups(result.paging.next, result.data);

  return res.json(groups);
});

app.post('/api/create', async (req, res) => {
  const token = getTokenByReq(req);

  if (!token) {
    return res.status(401).json({
      error: "No token"
    });
  }

  const access_token = accessTokens[token];

  const {
    message,
    link,
    groupId
  } = req.body;

  const {
    data: result,
    error
  } = await axios.post(`https://graph.facebook.com/v5.0/${groupId}/feed?access_token=${access_token}`, { message, link }).catch(error => ({ error }));

  if (error) {
    console.error(">>> api/create error", error);

    return res.status(400).json({
      message: error.message
    });
  }

  return res.json({
    id: result.id,
    url: `https://www.facebook.com/${result.id}`
  });
});

app.use(express.static('client/build'));

app.listen(PORT, () => console.log('App listening on port ' + PORT));