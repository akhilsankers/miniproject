const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path'); 
const hbs = require('hbs');
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Register =  require ("./db/regester");
const Seller = require('./db/seller');
const PreSeller = require('./db/preselreg');
const Admin =  require ("./db/admin");
//db connection
require ("./connection/conn");
const app = express();
app.use(cookieParser());
const port = process.env.PORT || 3000;

// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
// Register the partials directory if you are using any partials
hbs.registerPartials(path.join(__dirname, 'views/partials'));

//const partialsDir = path.join(__dirname, 'views', 'partials');
const layoutsDir = path.join(__dirname, 'views', 'layouts');
// Multer configuration for file upload (storing the file in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Set the view engine and register the partials
app.set('view engine', 'hbs');
hbs.registerPartials(layoutsDir);

// Set the express static folder
app.use(express.static('public'));

// Middleware to set the loginName variable globally
app.use(async function(req, res, next) {
  try {
    // Check if the user is logged in
    if (req.cookies.token) {
      // Retrieve the token from the cookies
      const token = req.cookies.token;

      // Perform a database query to find the user based on the token
      const user = await Register.findOne({ token }); // Assuming 'token' is the field name storing the token in the User model
      const suser = await Seller.findOne({ token }); 
      const auser = await Admin.findOne({ token }); 
      // Check if the user is found in the database
      if (user) {
        // Update the loginName variable with the user's name from the database
        res.locals.loginName = user.name;
      } else if (suser) {
        res.locals.loginName = suser.name;
      } else {
        res.locals.loginName = auser.name;
      }
    } 
    else {
      // User is not logged in, set the default loginName value
      res.locals.loginName = 'Login';
    }

    next();
  } catch (error) {
    console.error('Error retrieving user:', error);
    // If there is an error, set the default loginName value
    res.locals.loginName = 'Login';
    next();
  }
});


// Define your routes
app.get('/', function(req, res) {
  res.render('index');
});

// Define your routes login
app.get('/login', function(req, res) {
  res.render('login');
});
app.get('/ind', function(req, res) {
  res.render('indexselller');
});
app.get('/reg', function(req, res) {
  res.render('regester');
});

app.use(express.urlencoded({ extended: true }));
app.post('/login', async (req, res) => {
  
  try {
    const name = req.body.name;
    const password = req.body.password;
    console.log(`${name} password is ${password}`);
    const useremail = await Register.findOne({ email: name });

    const isMatch = await bcrypt.compare(password, useremail.password);
    if (isMatch ) {
      console.log('Login Successful');
      console.log(`Token: ${useremail.token}`);

      // Save the token in a cookie
      res.cookie('token', useremail.token, { httpOnly: true });

      return res.redirect(`/?name=${encodeURIComponent(useremail.name)}`);
    } else {
      return res.redirect(`/pop3`);
    }
  } catch (error) {
    console.log('Login Failed');
    return res.redirect(`/pop3`);
  }
});
// Route for logout
app.get("/logout", (req, res) => {
  // Check if the user is authenticated
  if (req.cookies.token) {
    const token = req.cookies.token;
    // Clear the token cookie
    console.log("LogOut Sucessfull");
    console.log(token);
    res.clearCookie("token");
    console.log("LogOut Sucessfull");
    return res.redirect("/");
  } else {
    return res.redirect("/"); // or any other suitable destination
  }
});
 
// Route for signing up
app.post('/sign_up', async (req, res) => {
  const emailRegex = /^[^\s@]+@gmail\.com$/i; // Regular expression for @gmail.com email validation
  try {
    const password = req.body.password;
    const cpassword = req.body.ConfirmPassword;
    const email = req.body.email;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return res.redirect(`/pop4`);
    }
    

    if (password === cpassword) {
      console.log('Password is correct');

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user using the Register model
      const registerEmployee = new Register({
        name: req.body.name,
        email: email,
        password: hashedPassword,
        token: '' ,// Initialize the token field with an empty string
        address: req.body.address,
        pincode: req.body.pincode,
      });

      // Save the user to the database
      const registered = await registerEmployee.save();

      // Generate a JWT token
      const token = jwt.sign({ userId: registered._id }, 'your_secret_key');

      // Update the user's token field
      registered.token = token;
      await registered.save();

      // Set the token as a cookie
      res.cookie('token', token, { httpOnly: true });

      // Redirect to the login page
      return res.redirect('/login');
    } else {
      console.log('Password is incorrect');
      return res.redirect(`/pop4`);
    }
  } catch (error) {
    console.log(error);
    console.log('Error occurred while registering');
      res.render('regester');
}});
// Define your routes for product
const Image = require('./model/Image'); // Import the Image model
const PreImage = require('./model/preimg');
const Wishlist = require('./model/wishlist');
app.get('/product', async (req, res) => {
  try {
    const searchKeyword = req.query.keyword; // Get the search keyword from the query parameter
    const category = req.query.category; 
    let query = {};
    if (searchKeyword) {
      query.name = { $regex: new RegExp(searchKeyword, 'i') };
    }
    
    if (category && category !== 'all') {
      query.category = category; // Add the category filter to the query if category is selected
    }
    
    const images = await Image.find(query);
    
    if (!images || images.length === 0) {
      res.render('nocart');
    }
    
    const productItems = images.map(image => {
      console.log('hi')
      return {
        src: `data:${image.contentType};base64,${image.data.toString('base64')}`,
        alt: image.name,
        link: `${image._id}`, // Include the /addToCart route with the product ID
        name: image.name,
        prize: image.prize,
        creater: image.creater,
        createrid: image.createrid,
        description: image.description
      };
    });
    

    res.render('product_list', { productItems });
  } catch (error) {
    console.error('Error retrieving images:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Define your routes for Single product

// Define your routes for cart
app.get('/cart', async(req, res) => 
{
    try {

      const token = req.cookies.token;
      if (!token) {
        return res.redirect(`/pop2`);
      }
  
      const decodedToken = jwt.verify(token, 'your_secret_key');
      const userId = decodedToken.userId;
      console.log('User ID:', userId);


      const carts = await Cart.find({ userId: userId });
  
      if (!carts || carts.length === 0) {
        res.render('nocart');
      }
  
      const cartItems = carts.map(cart => {
        console.log('User ID:', cart.userId);
        return {
          src: `data:${cart.contentType};base64,${cart.data.toString('base64')}`,
          alt: cart.productName,
          link: `${cart._id}`, // Include the /addToCart route with the product ID
          name: cart.productName,
          prize: cart.prize,
          quantity: cart.quantity
        };
      });
      
  
      res.render('cart', { cartItems });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
 
});

//remove from cart
app.get('/delete', async(req, res) =>{
  const productId = req.query.productId;
  console.log("product",productId);
    const ItemId = productId;
    try {
      const deletedCartItem = await Cart.findByIdAndDelete(ItemId);
      if (!deletedCartItem) {
        return res.status(404).send('Cart item not found.');
      }
  
     // res.send('Cart item removed successfully.');
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 

  //remove from Seller
app.get('/dele', async(req, res) =>{
  const productId = req.query.productId;
  console.log("product",productId);
    const ItemId = productId;
    try {
      const deletedCartItem = await Seller.findByIdAndDelete(ItemId);
      if (!deletedCartItem) {
        return res.status(404).send('Cart item not found.');
      }
  
     // res.send('Cart item removed successfully.');
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 

// Add item to the cart
// Define the route handler for adding items to the cart
const Cart = require('./model/carts');
app.get('/addtocart',async (req, res) => {

  try {
  const productId = req.query.productId; // Get the productId from the query parameter
  // Check if the token is present in the request cookies
    const token = req.cookies.token;

    if (!token) {
      console.log('not Successful');
      // If the token is not present, the user is not authenticated
        console.log('Route /addtocart was called with Product ID:', productId);
      return res.status(401).send('Unauthorized. Please log in to add items to the cart.');
    }
    console.log('Route /addtocart was called with Product ID:', productId);
    // Verify the token to get the user ID
    const decodedToken = jwt.verify(token, 'your_secret_key');
    const userId = decodedToken.userId;
    console.log('User ID:', userId); 
    // Find the user based on the user ID
    try {
      // Find the user based on the user ID
      const user = await Register.findById(userId);
    
      // Check if the user was found
      if (!user) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${userId} not found.`);
        return;
      }
    
      // If the user is found, you can access their data using the `user` variable
      console.log('User:', user);
    
      // Access specific fields of the user document using dot notation
      console.log('User Name:', user.name);
      console.log('User Email:', user.email);
    
      // You can perform any other operations with the `user` document here
    
    } catch (error) {
      console.error('Error finding user:', error);
      // Handle the error if there's an issue with the database query
    }
    // Find the product details based on the productId
    const product = await Image.findById(productId);
      if (!product) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${productId} not found.`);
        return;
      }
    // Create a new cart item with user ID and product details
    const cartItem = new Cart({
      userId: userId,
      productId: productId,
      productName: product.name,
      prize: product.prize,
      contentType :product.contentType,
      data:product.data,
     quantity: 1, // You can set the quantity based on user input
    });
    
    try {
  // Save the cart item to the database
  await cartItem.save();

  // Print the data collected in cartItem to the console
  console.log('Cart Item:', cartItem);

} catch (error) {
  console.error('Error saving cart item:', error);
}
   // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Internal Server Error');
  }
}); 



//another add to cart
app.post('/addtocart1',async (req, res) => {

  try {
  const productId = req.body.productId; // Get the productId from the query parameter
  // Check if the token is present in the request cookies
    const token = req.cookies.token;

    if (!token) {
      console.log('not Successful');
      // If the token is not present, the user is not authenticated
        console.log('Route /addtocart was called with Product ID:', productId);
      return res.status(401).send('Unauthorized. Please log in to add items to the cart.');
    }
    console.log('Route /addtocart was called with Product ID:', productId);
    // Verify the token to get the user ID
    const decodedToken = jwt.verify(token, 'your_secret_key');
    const userId = decodedToken.userId;
    console.log('User ID:', userId); 
    // Find the user based on the user ID
    try {
      // Find the user based on the user ID
      const user = await Register.findById(userId);
    
      // Check if the user was found
      if (!user) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${userId} not found.`);
        return;
      }
    
      // If the user is found, you can access their data using the `user` variable
      console.log('User:', user);
    
      // Access specific fields of the user document using dot notation
      console.log('User Name:', user.name);
      console.log('User Email:', user.email);
    
      // You can perform any other operations with the `user` document here
    
    } catch (error) {
      console.error('Error finding user:', error);
      // Handle the error if there's an issue with the database query
    }
    // Find the product details based on the productId
    const product = await Image.findById(productId);
      if (!product) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${productId} not found.`);
        return;
      }
    // Create a new cart item with user ID and product details
    const cartItem = new Cart({
      userId: userId,
      productId: productId,
      productName: product.name,
      prize: product.prize,
      contentType :product.contentType,
      data:product.data,
     quantity: 1, // You can set the quantity based on user input
    });
    
    try {
  // Save the cart item to the database
  await cartItem.save();
  res.redirect('/cart');
  // Print the data collected in cartItem to the console
  console.log('Cart Item:', cartItem);

} catch (error) {
  console.error('Error saving cart item:', error);
}
   // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Internal Server Error');
  }
}); 



// wishlist
app.get('/addtowish',async (req, res) => {

  try {
  const productId = req.query.productId; // Get the productId from the query parameter
  // Check if the token is present in the request cookies
    const token = req.cookies.token;

    if (!token) {
      console.log('not Successful');
      // If the token is not present, the user is not authenticated
        console.log('Route /addtowish was called with Product ID:', productId);
      return res.status(401).send('Unauthorized. Please log in to add items to the cart.');
    }
    console.log('Route /addtowish was called with Product ID:', productId);
    // Verify the token to get the user ID
    const decodedToken = jwt.verify(token, 'your_secret_key');
    const userId = decodedToken.userId;
    console.log('User ID:', userId); 
    // Find the user based on the user ID
    try {
      // Find the user based on the user ID
      const user = await Register.findById(userId);
    
      // Check if the user was found
      if (!user) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${userId} not found.`);
        return;
      }
    
      // If the user is found, you can access their data using the `user` variable
      console.log('User:', user);
    
      // Access specific fields of the user document using dot notation
      console.log('User Name:', user.name);
      console.log('User Email:', user.email);
    
      // You can perform any other operations with the `user` document here
    
    } catch (error) {
      console.error('Error finding user:', error);
      // Handle the error if there's an issue with the database query
    }
    // Find the product details based on the productId
    const product = await Image.findById(productId);
      if (!product) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${productId} not found.`);
        return;
      }
    // Create a new cart item with user ID and product details
    const cartItem = new Wishlist({
      userId: userId,
      productId: productId,
      productName: product.name,
      prize: product.prize,
      contentType :product.contentType,
      data:product.data,
     quantity: 1, // You can set the quantity based on user input
    });
    
    try {
  // Save the cart item to the database
  await cartItem.save();

  // Print the data collected in cartItem to the console
  console.log('Cart Item:', cartItem);

} catch (error) {
  console.error('Error saving cart item:', error);
}
   // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Internal Server Error');
  }
});


//view wishlist
app.get('/wishlist', function(req, res) {
  res.render("wishlist");
});
// Define your routes for cart

app.get('/wish', async(req, res) => 
{
    try {

      const token = req.cookies.token;
      if (!token) {
        return res.redirect(`/pop2`);
      }
  
      const decodedToken = jwt.verify(token, 'your_secret_key');
      const userId = decodedToken.userId;
      console.log('User ID:', userId);


      const carts = await Wishlist.find({ userId: userId });
  
      if (!carts || carts.length === 0) {
        console.log("hiiiiiii")
        res.redirect('/wishlist');
      }
  
      const cartItems = carts.map(cart => {
        console.log('User ID:', cart.userId);
        return {
          src: `data:${cart.contentType};base64,${cart.data.toString('base64')}`,
          alt: cart.productName,
          link: cart.productId, // Include the /addToCart route with the product ID
          name: cart.productName,
          prize: cart.prize,
          quantity: cart.quantity
        };
      });
      
  
      res.render('wishlist', { cartItems });
      //return res.redirect("/wish")
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
 
});

//remove from wishlist
app.post('/deletew', async (req, res) => {
  const productId = req.body.productId;
  try {
    const deletedCartItem = await Wishlist.findOneAndDelete({ productId });
    if (!deletedCartItem) {
      return res.status(404).send('Cart item not found.');
    }
    res.redirect('/wish?message=Cart item removed successfully.'); // Send the success message as a query parameter
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).send('Internal Server Error');
  }
});












//to shipping
const Ship = require('./model/shopping');
app.post('/buy', async (req, res) => {
  try {
    const productId = req.body.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error('Invalid productId:', productId);
      return res.status(400).send('Invalid productId.');
  }
    const quantity = req.body.quantity; // Get the productId from the query parameter
    // Check if the token is present in the request cookies
      const token = req.cookies.token;
      //console.log("hello",productId);
      console.log(quantity);
      if (!token) {
        console.log('not Successful');
        // If the token is not present, the user is not authenticated
          console.log('Route /addtocart was called with Product ID:', productId);
        //return res.status(401).send('Unauthorized. Please log in to add items to the cart.');
      }
      console.log('Route /addtocart was called with Product ID:', productId);
      // Verify the token to get the user ID
      const decodedToken = jwt.verify(token, 'your_secret_key');
      const userId = decodedToken.userId;
      console.log('User ID:', userId); 
      // Find the user based on the user ID
      const user = await Register.findById(userId);  
      if (!user) {
        // If the user is not found, you can handle it accordingly
        console.log(`User with ID ${productId} not found.`);
        return;
      }
      // Find the product details based on the productId
      const product = await Cart.findById(productId);
        if (!product) {
          // If the user is not found, you can handle it accordingly
          console.log(`User with ID ${productId} not found.`);
          return;
        }
        const price = product.prize * quantity;
        const userName = user.name;
        const userAddress = user.address;
        const pincode = user.pincode;
      // Create a new cart item with user ID and product details
      const shipitem = new Ship({
        userId: userId,
        username: userName,
        address: userAddress,
        pincode: pincode,
        productId: productId,
        productName: product.productName,
        prize: price,
        contentType :product.contentType,
        data:product.data,// You can set the quantity based on user input
        quantity: quantity,
      });
      
      try {
        // Check if the ship collection is empty
        const existingData = await Ship.find({});
        if (existingData.length === 0) {
          // If the collection is empty, directly save the new data
          await shipitem.save();
          res.redirect('/shippment');
        } else {
          // If the collection is not empty, remove all existing documents
          await Ship.deleteMany({});
          // Then, save the new data
          await shipitem.save();
          res.redirect('/shippment');
        }
      
        // Print the data collected in shipitem to the console
        console.log('ship Item:', shipitem);
      
        // Redirect to the cart page or any other suitable destination
        // res.redirect('/cart');
      } catch (error) {
        console.error('Error saving cart item:', error);
      }
     // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 

  // view item
  app.get('/shippment', async(req, res) =>
  {
    try {

      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send('Unauthorized. Please log in to view the cart.');
      }
  
      const decodedToken = jwt.verify(token, 'your_secret_key');
      const userId = decodedToken.userId;
      console.log('User ID:', userId);


      const ships = await Ship.find({ userId: userId });
  
      if (!ships || ships.length === 0) {
        res.render('nocart');
      }
  
      const sItems = ships.map(ship => {
        console.log('User ID:', ship.userId);
        return {
          src: `data:${ship.contentType};base64,${ship.data.toString('base64')}`,
          alt: ship.productName,
          link: `${ship._id}`, // Include the /addToCart route with the product ID
          name: ship.productName,
          username:ship.username,
          prize: ship.prize,
          address: ship.address,
          pincode : ship.pincode,
          qut : ship.quantity,
        };
      });
      
  
      res.render('shippment', { sItems });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
 
});
  
//order
const Order = require('./model/Order');
app.get('/order', async(req, res) =>{
  const productId = req.query.productId;
  try {
     // Get the productId from the query parameter
      // Find the product details based on the productId
      const product = await Ship.findById(productId);
        if (!product) {
          // If the user is not found, you can handle it accordingly
          console.log(`User with ID ${productId} not found.`);
          return;
        }
      // Create a new cart item with user ID and product details
      const orderitem = new Order({
        userId: product.userId,
        username: product.username,
        address: product.address,
        pincode: product.pincode,
        productId: productId,
        productName: product.productName,
        prize: product.prize,
        contentType :product.contentType,
        data:product.data,
        status:"confirmed",
        quantity : product.quantity// You can set the quantity based on user input
      });
      
      try {
    // Save the cart item to the database
    await orderitem.save();
  
    // Print the data collected in cartItem to the console
    console.log('order Item:', orderitem);
  
  } catch (error) {
    console.error('Error saving cart item:', error);
  }
     // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).send('Internal Server Error');
    }
    const cartItemId = productId;
    try {
      const deletedCartItem = await Ship.findByIdAndDelete(cartItemId);
      if (!deletedCartItem) {
        return res.status(404).send('Cart item not found.');
      }
      return res.redirect('/cart');
     // res.send('Cart item removed successfully.');
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 
//cancel
  app.post('/cancel', async(req, res) =>{
    const productId = req.body.productId;
      const cartItemId = productId;
      try {
        const deletedCartItem = await Ship.findByIdAndDelete(cartItemId);
        if (!deletedCartItem) {
          return res.status(404).send('Cart item not found.');
        }
        return res.redirect('/cart');
       // res.send('Cart item removed successfully.');
      } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).send('Internal Server Error');
      }
    }); 

 // view order item
 app.get('/ordered', async(req, res) =>
 {
   try {

     const token = req.cookies.token;
     if (!token) {
       return res.status(401).send('Unauthorized. Please log in to view the cart.');
     }
 
     const decodedToken = jwt.verify(token, 'your_secret_key');
     const userId = decodedToken.userId;
     console.log('User ID:', userId);


     const Orders = await Order.find({ userId: userId });
 
     if (!Order || Order.length === 0) {
       res.render('nocart');
     }
 
     const oItems = Orders.map(order => {
       console.log('User ID:', order.userId);
       return {
         src: `data:${order.contentType};base64,${order.data.toString('base64')}`,
         alt: order.productName,
         link: `${order._id}`, // Include the /addToCart route with the product ID
         name: order.productName,
         username:order.username,
         prize: order.prize,
         address: order.address,
         status:order.status,
         pincode : order.pincode,
       };
     });
     
 
     res.render('orders', { oItems });
   } catch (error) {
     console.error('Error retrieving images:', error);
     res.status(500).send('Internal Server Error');
   }

});


app.get('/pay', async(req, res) =>
 {try {

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send('Unauthorized. Please log in to view the cart.');
  }

  const decodedToken = jwt.verify(token, 'your_secret_key');
  const userId = decodedToken.userId;
  console.log('User ID:', userId);


  const ships = await Ship.find({ userId: userId });

  if (!ships || ships.length === 0) {
    res.render('nocart');
  }

  const sItems = ships.map(ship => {
    console.log('User ID:', ship.userId);
    return {
      src: `data:${ship.contentType};base64,${ship.data.toString('base64')}`,
      alt: ship.productName,
      link: `${ship._id}`, // Include the /addToCart route with the product ID
      name: ship.productName,
      username:ship.username,
      prize: ship.prize,
      address: ship.address,
      pincode : ship.pincode,
    };
  });
  

  res.render('payment', { sItems });
} catch (error) {
  console.error('Error retrieving images:', error);
  res.status(500).send('Internal Server Error');
}

});

app.get('/frm', async(req, res) =>
 {
  res.render('order-form');
});






//Start of seller side
app.get('/logsell', function(req, res) {
  res.render('logsel');
});
//login
app.post("/logsel", async (req, res) => {
  try {
    const name = req.body.name;
    const password = req.body.password;
    console.log(`${name} password is ${password}`);
    const Selleremail = await Seller.findOne({ email: name });
    const isMatch = await bcrypt.compare(password, Selleremail.password);

    if (isMatch) {
      console.log("Login Successful");
      console.log(`Token: ${Selleremail.token}`);

      // Save the token in a cookie
      res.cookie("token", Selleremail.token, { httpOnly: true });

      return res.redirect(`/add?name=${encodeURIComponent(Selleremail.name)}`);
    } else {
      res.send("Username or password is incorrect");
    }
  } catch (error) {
    return res.redirect(`/pop`);
    console.log("Login Failed");
  }
});
app.get('/sellup', function(req, res) {
  res.render('sellersignup');
});

//sellersingup
app.post('/seller_up', async (req, res) => {
  const emailRegex = /^[^\s@]+@gmail\.com$/i; // Regular expression for @gmail.com email validation
  try {
    const password = req.body.password;
    const cpassword = req.body.ConfirmPassword;
    const email = req.body.email;
    const aadhar = req.body.aadhar;
    const number = req.body.number;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format');
      return res.redirect(`/pop5`);
    }
       // Check if Aadhar number has exactly 12 digits and only contains numbers
       if (!/^\d{12}$/.test(aadhar)) {
        console.log('Invalid Aadhar number format');
        return res.redirect('/pop4');
      }
  
      // Check if mobile number has exactly 10 digits and only contains numbers
      if (!/^\d{10}$/.test(number)) {
        console.log('Invalid mobile number format');
        return res.redirect('/pop4');
      }
  
  
    if (password === cpassword) {
      console.log("Password is correct");
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new seller using the Seller model
      const newSeller = new PreSeller({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        aadhar:aadhar,
        contactnumber:number,
        token: '' // Initialize the token field with an empty string
      });
  
      // Save the seller to the database
      const savedSeller = await newSeller.save();
  
      // Generate a JWT token
      const token = jwt.sign({ sellerId: savedSeller._id }, 'your_secret_key');
  
      // Update the seller's token field
      savedSeller.token = token;
      await savedSeller.save();
  
      // Set the token as a cookie in the response
      res.cookie('token', token, { httpOnly: true });
  
      // Redirect to the login page
      return res.redirect('/pop6');
    } else {
      console.log("Password is incorrect");
      return res.redirect(`/pop5`);
    }
  } catch (error) {
    console.log(error);
    console.log("Error occurred while registering");
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// Add product
app.get('/add', function(req, res) {
  res.render("addproduct");
});

// inser the product to database
// Handle the image upload
app.post('/upl', upload.single('image'), async (req, res) => {
  console.log("uherhoht",req.file);
  try {
    // Check if the token is present in the request cookies
      const token = req.cookies.token;  
      if (!token) {
        console.log('not Successful');
      }
      // Verify the token to get the user ID
      const decodedToken = jwt.verify(token, 'your_secret_key');
      console.log(decodedToken);
      const userId = decodedToken.sellerId;
      console.log(decodedToken.sellerId);
      //const userId = decodedToken.userId; // The userId is directly accessed from the payload
  
      // You can directly use the userId for further processing or validation
        console.log('UserID:', userId);
        const user = await Seller.findById(userId);
      // Find the user based on the user ID
      try {
        // Find the user based on the user ID
      
        // Check if the user was found
        if (!user) {
          // If the user is not found, you can handle it accordingly
          console.log(`User with ID ${userId} not found.`);
          return;
        }
        // If the user is found, you can access their data using the `user` variable
        console.log('User:', user);
        // Access specific fields of the user document using dot notation
        console.log('User Name:', user.name);
        console.log('User Email:', user.email);
      } catch (error) {
        console.error('Error finding user:', error);
      }
      const sname =   user.name;
      if (req.file && req.file.buffer) {
        console.log('Image :', req.file);
        console.log('Image Buffer:', req.file.buffer);
      } else {
        console.log('Image Buffer is undefined');
      }

// catagory
const selectedCategory = req.body.category;
console.log(selectedCategory);

  
       // Create a new image object
          const newImage = new PreImage({
            name: req.body.name,
            prize: req.body.prize, // Assuming the price is sent in the request body
            description: req.body.description,// Assuming the description is sent in the request body
            creater:sname,
            createrid:userId, 
            data: req.file.buffer,
            contentType: req.file.mimetype,
            category:selectedCategory
          });

          try {
            // Save the image to MongoDB using await
            await newImage.save();
            return res.redirect("/add");
          } catch (err) {
            console.error(err);
            res.status(500).send('Error saving image to database.');
          }
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).send('Internal Server Error');
    }
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
});
//pop
app.get('/pop', function(req, res) {
  res.render("pop");
});
app.get('/pop1', function(req, res) {
  res.render("pop1");
});
app.get('/pop2', function(req, res) {
  res.render("pop2");
});
app.get('/pop3', function(req, res) {
  res.render("pop3");
});
app.get('/pop4', function(req, res) {
  res.render("pop4");
});
app.get('/pop5', function(req, res) {
  res.render("pop5");
});
app.get('/pop6', function(req, res) {
  res.render("pop6");
});
// seller profiler
app.get('/sp', async(req, res) => {
  try {
    // Check if the user is logged in
    if (req.cookies.token) {
      // Retrieve the token from the cookies
      const token = req.cookies.token;

      const suser = await Seller.findOne({ token }); 
      // Check if the user is found in the database
      console.log("name:",suser.name);
      res.locals.sname = suser.name;
      res.locals.semail = suser.email;
  } 
  }
  catch (error) {
    console.error('Error retrieving user:', error);
  }
  res.render("sprofile");
});



// view product added by the seller
app.get('/addproduct', async(req, res) => 
{
    try {

      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send('Unauthorized. Please log in to view the cart.');
      }
  
      const decodedToken = jwt.verify(token, 'your_secret_key');
      console.log(decodedToken);
      const userId = decodedToken.sellerId;
      console.log(decodedToken.sellerId);
      console.log(userId);


      const carts = await Image.find({ createrid: userId });
  
      if (!carts || carts.length === 0) {
        res.render('nocart');
      }
  
      const cartItems = carts.map(cart => {
        return {
          src: `data:${cart.contentType};base64,${cart.data.toString('base64')}`,
          alt: cart.name,
          link: `${cart._id}`, // Include the /addToCart route with the product ID
          name: cart.name,
          prize: cart.prize,
        };
      });
      
  
      res.render('added', { cartItems });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
 
});
app.post('/remove', async(req, res) =>{
  const productId = req.body.productId;
  console.log(productId);
    const ItemId = productId;
    try {
      const deletedCartItem = await Image.findByIdAndDelete(ItemId);
      if (!deletedCartItem) {
        return res.status(404).send('Cart item not found.');
      }
      return res.redirect("/addproduct");
     // res.send('Cart item removed successfully.');
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 

  // Define the route to get the creator's profile based on createrid
  app.get('/get_creator_profile', async (req, res) => {
    const creatorId = req.query.createrid;
    console.log(creatorId);
    try {
      const seller = await Seller.findOne({ _id: creatorId });
      console.log(seller.name); // Log the seller name to verify
      if (seller) {
          // If the profile exists, render the 'sprofile1' view and pass the seller data
          res.render('sprofile1', { profile: seller });
      } else {
          // If the profile does not exist, render an error page or handle it as needed
          res.status(404).send('Creator profile not found');
      }
  } catch (error) {
      console.error('Error fetching creator profile:', error);
      res.status(500).send('Internal Server Error');
  }
  });

  app.get('/sp1', function(req, res) {
    res.render("sprofile1");
  });
  app.get('/sp2', async(req, res) => {
    try {
      // Check if the user is logged in
      if (req.cookies.token) {
        // Retrieve the token from the cookies
        const token = req.cookies.token;
  
        const suser = await Register.findOne({ token }); 
        // Check if the user is found in the database
        console.log("name:",suser.name);
        res.locals.oname = suser.name;
        res.locals.oemail = suser.email;
        res.locals.oaddress = suser.address;
        res.locals.opin = suser.pincode;
    } 
    }
    catch (error) {
      console.error('Error retrieving user:', error);
    }
    res.render("profile");
  });


  // admin
  app.get('/admin', function(req, res) {
    res.render('admin');
  });
  app.get('/adreg', function(req, res) {
    res.render('adreg');
  });
  app.get('/amin', async(req, res) =>{
    try {
      const seller = await Seller.find();
  
      if (!seller || seller.length === 0) {
        return res.status(404).send('No images found');
      }
      const admini = seller.map(seller => {
        console.log('hi')
        return {
          link: `${seller._id}`, // Include the /addToCart route with the product ID
          name: seller.name,
          email:seller.email
        };
      });
      
  
      res.render('admain', { admini });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  app.post('/admin', async (req, res) => {
    try {
      const name = req.body.name;
      const password = req.body.password;
      console.log(`${name} password is ${password}`);
      const useremail = await Admin.findOne({ email: name });
      const isMatch = await bcrypt.compare(password, useremail.password);
      if (isMatch ) {
        console.log('Login Successful');
        console.log(`Token: ${useremail.token}`);
  
        // Save the token in a cookie
        res.cookie('token', useremail.token, { httpOnly: true });
  
        return res.redirect(`/amin?name=${encodeURIComponent(useremail.name)}`);
      } else {
        return res.redirect(`/pop1`);
      }
    } catch (error) {
      console.log('Login Failed');
      return res.redirect(`/pop1`);
    }
  });
  // render accept
  app.get('/accept', async(req, res) =>{
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send('Unauthorized. Please log in to view the cart.');
      }
      const seller = await PreSeller.find();
  
      if (!seller || seller.length === 0) {
        res.render('accept');
      }
      const accept = seller.map(seller => {
        console.log('hi')
        return {
          link: `${seller._id}`, // Include the /addToCart route with the product ID
          name: seller.name,
          email:seller.email,
          aadhar:seller.aadhar,
          number:seller.contactnumber 

        };
      });
      
  
      res.render('accept', { accept });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
    }); 
 


// Accepting  or rejecting sellers
app.get('/acce', async(req, res) =>{
  const sId = req.query.productId;
  try {
     // Get the productId from the query parameter
      // Find the product details based on the productId
      const seller1 = await PreSeller.findById(sId);
        if (!seller1) {
          // If the user is not found, you can handle it accordingly
          console.log(`User with ID ${productId} not found.`);
          return;
        }
      // Create a new cart item with user ID and product details
      const orderitem = new Seller ({
        name: seller1.name, 
        email:seller1.email, 
        password:seller1.password,
        aadhar:seller1.aadhar,
        contactnumber:seller1.contactnumber,
        token:'',
      });
      
      try {
    // Save the cart item to the database
    const registered = await orderitem.save();

    // Generate a JWT token
    const token = jwt.sign({ sellerId: registered._id }, 'your_secret_key');
    //const token = jwt.sign({ sellerId: savedSeller._id }, 'your_secret_key');
    // Update the user's token field
    registered.token = token;
    await registered.save();
    
    // Print the data collected in cartItem to the console
    console.log('order Item:', orderitem);
  
  } catch (error) {
    console.error('Error saving cart item:', error);
  }
     // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).send('Internal Server Error');
    }
    const cartItemId = sId;
    try {
      const deletedCartItem = await PreSeller.findByIdAndDelete(cartItemId);
      if (!deletedCartItem) {
        return res.status(404).send('Cart item not found.');
      }
  
     // res.send('Cart item removed successfully.');
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }); 
//cancel
  app.get('/dele', async(req, res) =>{
    const productId = req.query.productId;
      const cartItemId = productId;
      try {
        const deletedCartItem = await PreSeller.findByIdAndDelete(cartItemId);
        if (!deletedCartItem) {
          return res.status(404).send('Cart item not found.');
        }
    
       // res.send('Cart item removed successfully.');
      } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).send('Internal Server Error');
      }
    }); 

    // viewing product in that area
app.get('/accepro', async (req, res) => {
  try { 
    const images = await PreImage.find();
    
    if (!images || images.length === 0) {
      res.render('nocart1');
    }
    
    const acceptItems = images.map(image => {
      console.log('hi')
      return {
        src: `data:${image.contentType};base64,${image.data.toString('base64')}`,
        alt: image.name,
        link: `${image._id}`, // Include the /addToCart route with the product ID
        name: image.name,
        prize: image.prize,
        creater: image.creater,
        createrid: image.createrid,
        description: image.description
      };
    });
    

    res.render('acceptpro', { acceptItems });
  } catch (error) {
    console.error('Error retrieving images:', error);
    res.status(500).send('Internal Server Error');
  }
});


// aceept or reject product
  app.get('/accpro', async(req, res) =>{
    const productId = req.query.productId;
    try {
      console.log("ididid:",productId)
       // Get the productId from the query parameter
        // Find the product details based on the productId
        const product = await PreImage.findById(productId);
          if (!product) {
            // If the user is not found, you can handle it accordingly
            console.log(`User with ID ${productId} not found.`);
            return;
          }
        // Create a new cart item with user ID and product details
        const orderitem = new Image({       
         // Include the /addToCart route with the product ID
          name: product.name,
          prize: product.prize,
          creater: product.creater,
          createrid: product.createrid,
          description: product.description,
          data:product.data ,
          contentType :product.contentType,
          category:product.category
        });
        
        try {
      // Save the cart item to the database
      await orderitem.save();
    
      // Print the data collected in cartItem to the console
      console.log('order Item:', orderitem);
    
    } catch (error) {
      console.error('Error saving cart item:', error);
    }
       // res.redirect('/cart'); // Redirect to the cart page or any other suitable destination
      } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Internal Server Error');
      }
      const cartItemId = productId;
      try {
        const deletedCartItem = await PreImage.findByIdAndDelete(cartItemId);
        if (!deletedCartItem) {
          return res.status(404).send('Cart item not found.');
        }
    
       // res.send('Cart item removed successfully.');
      } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).send('Internal Server Error');
      }
    }); 
  //cancel
    app.get('/delepro', async(req, res) =>{
      const productId = req.query.productId;
        const cartItemId = productId;
        try {
          const deletedCartItem = await PreImage.findByIdAndDelete(cartItemId);
          if (!deletedCartItem) {
            return res.status(404).send('Cart item not found.');
          }
      
         // res.send('Cart item removed successfully.');
        } catch (error) {
          console.error('Error removing cart item:', error);
          res.status(500).send('Internal Server Error');
        }
      }); 

//feedback
const Feed = require('./model/feedback');
app.post('/spro1', async (req, res) => {
  
  try {

    const token = req.cookies.token;
    if (!token) {
      return res.redirect(`/pop`);
    }

    const decodedToken = jwt.verify(token, 'your_secret_key');
    const userId = decodedToken.userId;
    console.log('User ID:', userId);
    const user = await Register.findById(userId);
    console.log(user.name)
    const sellerid = req.body.sId;
    console.log(sellerid)
    console.log(userId)
    const newImage = new Feed({
     name: user.name, // Assuming the price is sent in the request body
     description: req.body.feedback,// Assuming the description is sent in the request body
      creater:userId,
      createrid:sellerid, 
    });

    try {
      // Save the image to MongoDB using await
      await newImage.save();
      return res.redirect("/product");
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving image to database.');
    }
    //const carts = await Cart.find({ userId: userId });
    //const feed = req.body.feedback;
    //
  } catch (error) {
    console.log('Login Failed');
    return res.redirect(`/pop3`);
  }
});

// view feed back
app.get('/vfeed', async(req, res) => 
{
    try {

      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send('Unauthorized. Please log in to view the cart.');
      }
  
      const decodedToken = jwt.verify(token, 'your_secret_key');
      console.log(decodedToken);
      const userId = decodedToken.sellerId;
      console.log(decodedToken.sellerId);
      console.log(userId);


      const carts = await Feed.find({ createrid: userId });
  
      if (!carts || carts.length === 0) {
       console.log("empty")
      }
  
      const cartItems = carts.map(cart => {
        return {
          name: cart.name, // Include the /addToCart route with the product ID
          dis: cart.description,
        };
      });
      
  
      res.render('feedback', { cartItems });
    } catch (error) {
      console.error('Error retrieving images:', error);
      res.status(500).send('Internal Server Error');
    }
 
});

// Start the server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
