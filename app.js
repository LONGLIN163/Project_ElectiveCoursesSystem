var express=require("express");
var mongoose=require("mongoose");
var session=require("express-session");

var adminCtrl=require("./controllers/adminCtrl");
//Create express app obj
var app = express();
//Connect to database
mongoose.connect('mongodb://localhost/scdb', {useNewUrlParser: true});
//Use session
app.use(session({
    secret: 'studnetCourseSystemDB',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }))

//Set model engine
app.set("view engine","ejs");
//Middlewares,routers
app.get('/admin',adminCtrl.showAdminDashboard);
app.get('/admin/student',adminCtrl.showAdminStudent);
app.get('/admin/student/import',adminCtrl.showAdminStudentImport);
app.post('/admin/student/import',adminCtrl.doAdminStudentImport);

app.get('/admin/course',adminCtrl.showAdminCourse);
app.get('/admin/report',adminCtrl.showAdminReport);

app.get('/student',adminCtrl.getAllStudents); //get all students


//Set static file
app.use(express.static("public"));
//Set 404 info page
/*
app.use(function(req,res){
    res.send("404! The page doesn't exist!!!");
})*/


app.listen(3000);
console.log("The app is running on 3000!")