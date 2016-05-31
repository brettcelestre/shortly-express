var express     = require('express');
var util        = require('./lib/utility');
var partials    = require('express-partials');
var bodyParser  = require('body-parser');
var session     = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
// Starts our session
app.use(session({
  secret: '15thfloor'
}));


app.get('/users', 
  function(req, res){
    Users.reset().fetch().then(function(users) {
      res.send(200, users.models);
    });
});

app.get('/', 
function(req, res) {
  Users.reset().fetch();
  util.restrict(req, res, function(){
    res.render('index');
  });
});

app.get('/create', 
function(req, res) {
  util.restrict(req, res, function(){
    res.render('index');
  });
});

app.get('/links', 
function(req, res) {
  util.restrict(req, res, function(){
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

//get signup page
app.get('/signup', 
function(req, res) {
  res.render('signup');
});

// app.get('/remove',
//   function(req, res){
//     // var removeUser = req.url.substring(7);
//     // var name = window.prompt('who do you want to remove?');
//     // var id = Users.findWhere({username: 'test1'});
//     Users.remove(2);
//     // console.log('removeUser', removeUser);
//     res.send(200, 'hello');
// });

//signup post route
app.post('/signup',
  function(req, res) {
    console.log('signup req.body', req.body);
    
    // console.log('Users ', Users);

    //check to see if user exists with username
    if ( !Users.findWhere({username: req.body.username}) ){
      //separate username and password
      var newUser = new User(req.body);
      newUser.save().then(function(newUser) {
        Users.add(newUser);
        console.log('Inside newUser save/then method');
        res.redirect('/');
        // res.send(200, Users);
      });
    } else {
      
      // TODO---: Make this section run smoother:

      // alert('This username already exists. Try something else.');
      res.send(500, 'This username already exists. Try something else.');
      // res.send(500, '/signup');
      // res.redirect('/signup');
    }
    
});

// Login GET route
app.get('/login', 
function(req, res) {
  // Loads all of the Users info into the server on page load
  Users.reset().fetch();
  res.render('login');

  // RETHINK THIS
  // util.restrict(req, res, function(){
  //   // Response renders login page
  //   res.redirect('/');
  // });
});

// Login POST route
app.post('/login',
  function(req, res){

    Users.reset().fetch();

    var username = req.body.username;
    var password = req.body.password;


    // Check Users collection if user/pass exists
    if ( Users.findWhere(req.body) ){
      // create a session with user/pass
      req.session.regenerate(function(){
        req.session.user = username;
        // return to their index page, load their link collection
        res.redirect('/');
        // res.send(302, {location: '/'});
      });
    } else {
      console.log('app.post /login ran');
      console.log('Users.reset().fetch()', Users.reset().fetch());
      
      // Users.reset().fetch().then(function(users) {
      //   console.log('users.models', users.models);
      //   res.send(200, users.models);
      // });

      // TODO---: Create message that login info was incorrect

      // START HERE ----------------------------------------------------------
      // Need to send response with a redirect to /login

      // We need to write res.writeHeader( with the location )

      // Return login page with error message
      // res.redirect('/login');
      res.send(302, '/login');
    }
});

app.get('/logout',
  function(req, res){
    req.session.destroy(function(){
      res.redirect('/');
    });
});

app.post('/links', 
function(req, res) {

  //added to check submit button
  console.log('post link with shorten button req: ', req.body);

  var uri = req.body.url;
  // var salt = req.session.user;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          // salt: salt,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your dedicated authentication routes here
// e.g. login, logout, etc.
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
