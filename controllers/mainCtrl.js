var formidable = require('formidable');
var Student = require("../models/Student");
var crypto = require("crypto");
var Course = require("../models/Course");
var _= require("underscore");


exports.showLogin=function(req,res){
    res.render("login.ejs",{
        page:"login"
    });
}

exports.showMyCourses=function(req,res){
    console.log("session:"+req.session.login)
    if(req.session.login != true){
        res.redirect("/login");
        return;
    }
    // present home page
    res.render("myCourses.ejs",{
        sid:req.session.sid,
        name:req.session.name,
        grade:req.session.grade
    });
}


exports.checkMyCourses=function(req,res){
    if(req.session.login != true){
        res.redirect("/login");
        return;
    }
    Student.find({"sid":req.session.sid},function(err,students){
        var thestudent=students[0];
        var mycourses=thestudent.mycourses;

        Course.find({"cid": mycourses},function(err,courses){
            //console.log("checkmycourse",courses);
            res.json({"results":courses});
        })
    })
}


exports.doLogout=function(req,res){
    req.session.login = false;
    req.session.name = "";
    res.redirect("/login");
    return;
}

exports.doLogin=function(req,res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        if(err){
            res.json({"result":-1});//-1: server error
            return;
        }
        var sid=fields.sid;
        var password=fields.password;
        //console.log(sid,password)

        Student.find({"sid":sid},function(err,results){
            if(err){
                res.json({"result":-1});//-1: server error
                return;
            }
            if(results.length==0){
              res.json({"result":-2});//-2: no such student
              return;
            }

            //if this student exist, then check if she / he had change pwd
            var changedPassword=results[0].changedPassword;
            if(!changedPassword){
                //if this student hasnt changed pwd, then compares with the password from the resigter filed's pwd
                if(results[0].password===password){
                    //********if login success, send a session to the user,it has be in front json result***********
                    req.session.login=true;
                    // mean while keep info in session
                    req.session.sid=sid;
                    req.session.name = results[0].name;
                    req.session.changedPassword = false;
                    req.session.grade = results[0].grade;
                    res.json({"result":1});//1: login success
                    return;
                }else{
                    res.json({"result":-3});//-3:username exist, but your pwd is wrong
                    return;
                }         
            }else{
                //if this student has changed pwd(sha256), then encrypt the password from login, then compare with the pwd in the database
                if(results[0].password===crypto.createHash("sha256").update(password).digest("hex")){
                    
                    // save info in the session again.
                    req.session.login=true;
                    req.session.sid=sid;
                    req.session.name = results[0].name;
                    req.session.changedPassword = true;
                    req.session.grade = results[0].grade;
                    res.json({"result":1});//1: login success
                }else{
                    res.json({"result":-3});//-3:username exist, but your pwd is wrong
                    return;
                }

            }

        })
    })
}


exports.showIndex=function(req,res){
    console.log("session:"+req.session.login)
    if(req.session.login != true){
        res.redirect("/login");
        return;
    }
    // if use dont chang the initial pwd, we dont allow them to see home, force them direct to changepwd page
    if(req.session.changedPassword == false){
        res.redirect("/changePwd");
        return;
    }

    // present home page
    res.render("index.ejs",{
        sid:req.session.sid,
        name:req.session.name,
        grade:req.session.grade
    });

}

exports.showChangePwd=function(req,res){
    if(req.session.login != true){
        res.redirect("/login");
        return;
    }
    res.render("changePwd.ejs",{
        sid:req.session.sid,
        name:req.session.name,
        grade:req.session.grade,
        showTip:!req.session.changedPassword
    });
}


exports.doChangePwd=function(req,res){
    console.log("doChangePwd-pwd:")
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var password=fields.password;
        console.log("doChangePwd-pwd:",password)
        Student.find({"sid":req.session.sid},function(err,results){

            var thestudent=results[0];

            thestudent.changedPassword=true;
            req.session.changedPassword = true;
            // ***********MD5 encryption*************
            //if this student has changed pwd, then use MD5 encrypt the password from the resigter form,then compare with the pwd in the database
            thestudent.password=crypto.createHash("sha256").update(password).digest("hex");

            thestudent.save();
            res.json({"result":1});
            
        })
    })
}

exports.checkCourseApplicable=function(req,res){
    if(req.session.login != true){
        res.redirect("/login");
        return;
    }
    //update a student course in cmd: db.students.update({sid:'150104001'},{$set:{mycourses:['2']}})
    //var results=[];
    var results={};
    Student.find({"sid":req.session.sid},function(err,students){
        var thestudent=students[0];
        // this student need to find all the days of week of his/her courses.
        //console.log("his courses---",thestudent.mycourses)
        var mycourses=thestudent.mycourses;
        console.log("mycourses",mycourses);
        //  map mcourse id to the day of week,then put the value to an arr
        var cidMapToDayOfWeek={};
        var myOccupiedDays=[];
        var grade=thestudent.grade;
        // check all courses
        Course.find({},function(err,courses){
            courses.forEach(function(item){
               //console.log(item)
                if(mycourses.indexOf(item.cid)!=-1){
                    cidMapToDayOfWeek[item.cid]=item.dayofweek;
                    myOccupiedDays.push(item.dayofweek);
                }
               
            })
            console.log("cidMapToDayOfWeek",cidMapToDayOfWeek);//{ '2': 'tusday' ,.........}
            console.log("myOccupiedDays",myOccupiedDays)
             courses.forEach(function(item){
                if(mycourses.indexOf(item.cid)!=-1){// if has already applied this course
                    //results.push({"cid":item.cid,"result":"You have applied this course"});
                    results[item.cid]="Course Applied";
                }else if(myOccupiedDays.indexOf(item.dayofweek)!=-1){// then check if this course has already been occupied
                    //results.push({"cid":item.cid,"result":"You have applied the other course at the same day"});
                    results[item.cid]="Day used";
                }else if(item.number<=0){// then check if this course is full
                    //results.push({"cid":item.cid,"result":"The course is full"});
                    results[item.cid]="Course full";
                }else if(item.allow.indexOf(grade)==-1){// then check if this guy's grade is allowed or not
                    //results.push({"cid":item.cid,"result":"Your grade is not allow to apply this course"});
                    results[item.cid]="Grade mismatch";
                }else if(myOccupiedDays.length==2){// then check if this guy's grade is allowed or not
                    results[item.cid]="Reached limit";
                } else{// then check if this guy's grade is allowed or not
                    //results.push({"cid":item.cid,"result":1});
                    results[item.cid]="Course applicable";
                }
             })

             res.json(results);
        
        })
    })

} 


exports.applyCourse=function(req,res){
    var sid=req.session.sid;
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var cid=fields.cid;
        Student.find({"sid":sid},function(err,students){
            var thestudent=students[0];
            thestudent.mycourses.push(cid);
            thestudent.save();
            
            Course.find({"cid":cid},function(err,courses){
                var thecourse=courses[0];
                thecourse.mystudents.push(sid);
                thecourse.number--;
                thecourse.save(function(){
                    res.json({"result":1});
                    
                });
            })
        })
    })
} 


exports.cancelCourse=function(req,res){
    var sid=req.session.sid;
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var cid=fields.cid;
        Student.find({"sid":sid},function(err,students){
            var thestudent=students[0];
            thestudent.mycourses=_.without(thestudent.mycourses,cid);

            thestudent.save();
            
            Course.find({"cid":cid},function(err,courses){
                var thecourse=courses[0];
                thecourse.mystudents=_.without(thecourse.mystudents,sid);
                thecourse.number++;
                thecourse.save(function(){
                    res.json({"result":1});
                    
                });
            })
        })
    })
} 