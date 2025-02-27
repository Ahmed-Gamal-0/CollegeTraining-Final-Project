const path = require('path');
const express = require('express');
const session = require('express-session');
const connection = require('./database');
const flash = require('connect-flash');
const cors = require('cors');
const multer = require('multer');
const app = express();

const port = 8080;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Enable CORS to allow requests from the specified origin
app.use(cors({
    origin: `http://localhost:${port}`,
    methods: 'GET,POST',
    credentials: true
}));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend/views'));
app.use(express.static(path.join(__dirname, 'frontend')));

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON data
app.use(express.json());

// Configure session middleware
app.use(session({
    secret: 'dakrory',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(flash());

// Middleware to set up flash messages for success and error
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});

// Authentication check middleware
function checkAuthentication(req, res, next) {
    if (req.session.userEmail) {
        next();
    } else {
        req.flash('errorMessage', 'You must log in first to access this page.');
        res.redirect('/login');
    }
}

// Login Routes  =>
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public', 'login.html'));
});

app.post('/login', (req, res) => {
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    if (userEmail && userPassword) {
        const query = 'SELECT * FROM students WHERE email = ? AND pass = ?';
        connection.query(query, [userEmail, userPassword], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.status(500).json({ message: 'Server error' });
                return;
            }

            if (results.length > 0) {
                req.session.userEmail = userEmail;
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
        });
    } else {
        res.status(400).json({ success: false, message: 'Please enter both email and password' });
    }
});


app.get('/signup', (req, res) => {

    res.sendFile(path.join(__dirname, 'frontend/public', 'signup.html'));
});

// Handle form submission for signup
app.post('/signup', (req, res) => {
    const userName = req.body.name;
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    if (userName && userEmail && userPassword) {
        const checkQuery = 'SELECT * FROM students WHERE email = ?';
        connection.query(checkQuery, [userEmail], (checkErr, checkResults) => {
            if (checkErr) {
                console.error('Error checking email:', checkErr);
                return res.status(500).json({message: 'Server error. Please try again.'});
            }

            if (checkResults.length > 0) {
                return res.status(400).json({message: 'Email already registered.'});
            }

            const insertQuery = 'INSERT INTO students (std_name, email, pass) VALUES (?, ?, ?)';
            connection.query(insertQuery, [userName, userEmail, userPassword], (insertErr) => {
                if (insertErr) {
                    console.error('Error executing query:', insertErr);
                    return res.status(500).json({message: 'Server error. Please try again.'});
                }

                req.session.userEmail = userEmail;
                return res.status(200).json({message: 'Signup successful'});
            });
        });
    } else {
        return res.status(400).json({message: 'Please provide all required fields.'});
    }
});


// profile -------------------------------
app.get('/profile', (req, res) => {
    const userEmail = req.session.userEmail;

    if (userEmail) {
        const query = 'SELECT * FROM students WHERE email = ?';
        connection.query(query, [userEmail], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.status(500).json({ message: 'Server error' });
                return;
            }

            if (results.length > 0) {
                const user = results[0];
                res.render('profile', { user });
            } else {
                res.redirect('/login');
            }
        });
    } else {
        res.redirect('/login');
    }
});
app.post('/upload-profile-picture', upload.single('profile_picture'), (req, res) => {
    const userEmail = req.session.userEmail;
    if (!userEmail) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const imageData = req.file ? req.file.buffer : null;

    if (imageData) {
        const query = 'UPDATE students SET profile_picture = ? WHERE email = ?';
        connection.query(query, [imageData, userEmail], (err, results) => {
            if (err) {
                console.error('Error updating image:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.json({ success: true, message: 'Profile picture updated successfully' });
        });
    } else {
        res.status(400).json({ success: false, message: 'No image uploaded' });
    }
});

app.get('/profile-picture', checkAuthentication, (req, res) => {
    const userEmail = req.session.userEmail;

    const query = 'SELECT profile_picture FROM students WHERE email = ?';
    connection.query(query, [userEmail], (err, results) => {
        if (err) {
            console.error('Error retrieving image:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (results.length > 0 && results[0].profile_picture) {
            const imageData = results[0].profile_picture;
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(imageData);
        } else {
            res.status(404).json({ success: false, message: 'Image not found' });
        }
    });
});

// Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public', 'index.html'));
});

// Message Routes
app.get('/message', checkAuthentication, (req, res) => {
    res.render('message');
});

// Courses Routes
app.get('/courses', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public', 'courses.html'));
});

app.get('/courses-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public', 'course-detail.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


// const path = require('path');
// const express = require('express');
// const session = require('express-session');
// const connection = require('./database');
// const flash = require('connect-flash');
// const cors = require('cors');
// const multer = require('multer'); 
// const app = express();

// const port = 8080;
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // Enable CORS to allow requests from the specified origin
// app.use(cors({
//     origin: `http://localhost:${port}`,
//     methods: 'GET,POST',
//     credentials: true
// }));

// // Set EJS as the templating engine
// app.set('view engine', 'ejs');

// app.set('views', path.join(__dirname, 'frontend/views'));
// app.use(express.static(path.join(__dirname, 'frontend/public')));

// // Middleware to parse URL-encoded data
// app.use(express.urlencoded({ extended: true }));

// // Middleware to parse JSON data
// app.use(express.json());

// // Configure session middleware
// app.use(session({
//     secret: 'dakrory',
//     resave: true,
//     saveUninitialized: true,
//     cookie: { secure: false }
// }));
// app.use(flash())

// //login --------------------------------------------------------------

// app.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend/public', 'login.html'));
// });


// app.post('/login', (req, res) => {
//     const userEmail = req.body.email;
//     const userPassword = req.body.password;

//     if (userEmail && userPassword) {
//         const query = 'SELECT * FROM students WHERE email = ? AND pass= ?';
//         connection.query(query, [userEmail, userPassword], (err, results) => {
//             if (err) {
//                 console.error('Error executing query:', err);
//                 res.status(500).json({ message: 'Server error' });
//                 return;
//             }
            
//             if (results.length > 0) {
//                 req.session.userEmail = userEmail; 
//                 res.json({ success: true, message: 'Login successful' });
//             } else {
//                 res.status(401).json({ success: false, message: 'Invalid email or password' });
//             }
//         });
//     } else {
//         res.status(400).json({ success: false, message: 'Please enter both email and password' });
//     }
// });


// // sign up -----------------------------------------------------------

// // app.get('/signup', (req, res) => {
// //     // res.sendFile(path.join(__dirname, 'frontend/views', 'signup.ejs'));
// //     res.render('signup');
// // });

// app.get('/signup', (req, res) => {
//     res.render('signup', { errorMessage: req.flash('error') });
// });

// app.post('/signup', (req, res) => {
//     const userName = req.body.name;
//     const userEmail = req.body.email;
//     const userPassword = req.body.password;

//     if (userName && userEmail && userPassword) {
//         const checkQuery = 'SELECT * FROM students WHERE email = ?';
//         connection.query(checkQuery, [userEmail], (checkErr, checkResults) => {
//             if (checkErr) {
//                 console.error('Error checking email:', checkErr);
//                 return res.status(500).json({ success: false, message: 'Server error' });
//             }

//             if (checkResults.length > 0) {
             
//                 return res.status(400).json({ success: false, message: 'Email already registered' });
//             }

//             const insertQuery = 'INSERT INTO students (std_name, email, pass) VALUES (?, ?, ?)';
//             connection.query(insertQuery, [userName, userEmail, userPassword], (insertErr, insertResults) => {
//                 if (insertErr) {
//                     console.error('Error executing query:', insertErr);
//                     return res.status(500).json({ success: false, message: 'Server error' });
//                 }

//                 req.session.userEmail = userEmail; 
//                 res.json({ success: true, message: 'Signup successful' });
//             });
//         });
//     } else {
//         res.status(400).json({ success: false, message: 'Please provide all required fields' });
//     }
// });

// // profile --------------------------------------------------------

// app.get('/profile', (req, res) => {
//     const userEmail = req.session.userEmail;

//     if (userEmail) {
//         const query = 'SELECT * FROM students WHERE email = ?';
//         connection.query(query, [userEmail], (err, results) => {
//             if (err) {
//                 console.error('Error executing query:', err);
//                 res.status(500).json({ message: 'Server error' });
//                 return;
//             }

//             if (results.length > 0) {
//                 const user = results[0];
//                 res.render('profile', { user });
//             } else {
//                 res.redirect('/login');
//             }
//         });
//     } else {
//         res.redirect('/login');
//     }
// });

// app.post('/upload-profile-picture', upload.single('profile_picture'), (req, res) => {
//     const userEmail = req.session.userEmail;
//     if (!userEmail) {
//         return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     const imageData = req.file ? req.file.buffer : null;

//     if (imageData) {
//         const query = 'UPDATE students SET profile_picture = ? WHERE email = ?';
//         connection.query(query, [imageData, userEmail], (err, results) => {
//             if (err) {
//                 console.error('Error updating image:', err);
//                 return res.status(500).json({ success: false, message: 'Server error' });
//             }
//             res.json({ success: true, message: 'Profile picture updated successfully' });
//         });
//     } else {
//         res.status(400).json({ success: false, message: 'No image uploaded' });
//     }
// });


// app.get('/profile-picture', (req, res) => {
//     const userEmail = req.session.userEmail;
//     if (!userEmail) {
//         return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     const query = 'SELECT profile_picture FROM students WHERE email = ?';
//     connection.query(query, [userEmail], (err, results) => {
//         if (err) {
//             console.error('Error retrieving image:', err);
//             return res.status(500).json({ success: false, message: 'Server error' });
//         }

//         if (results.length > 0 && results[0].profile_picture) {
//             const imageData = results[0].profile_picture;
//             res.writeHead(200, { 'Content-Type': 'image/jpeg' }); 
//             res.end(imageData);
//         } else {
//             res.status(404).json({ success: false, message: 'Image not found' });
//         }
//     });
// });





// // home -----------------------------------------------------------
// app.get('/',(req,res)=>{
//     res.sendFile(path.join(__dirname, 'frontend/public', 'index.html'));
// })



// // message ---------------------------------------------------------------

// // Middleware to set up flash messages for success and error
// app.use((req, res, next) => {
//     res.locals.successMessage = req.flash('successMessage');
//     res.locals.errorMessage = req.flash('errorMessage');
//     next();
// });

// function checkAuthentication(req, res, next) {
//     if (req.session.isAuthenticated) {
//         next();
//     } else {
//         req.flash('errorMessage', 'You must log in first to send a message.');
//         res.redirect('/signup');
//     }
// }

// app.get('/message',checkAuthentication,(req,res)=>{
//     // res.sendFile(path.join(__dirname, 'frontend/public', 'message-page.html'));
//     res.render('message');

// })

// // courses -------------------------------------------------------------------
// app.get('/courses',(req,res)=>{
//     res.sendFile(path.join(__dirname, 'frontend/public', 'courses.html'));
// })

// // courses-detail-------------------------------------------------------------
// app.get('/courses-detail',(req,res)=>{
//     res.sendFile(path.join(__dirname,'frontend/public','course-detail.html'))
// })




// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });