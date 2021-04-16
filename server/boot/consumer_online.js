var request = require("request");

var moment = require("moment");



var express = require("express");

var axios = require("axios");

var schedule = require("node-schedule");

var connectivity = require("connectivity");

var winston = require("winston");

var internetAvailable = require("internet-available");

//sql connection to live db

let mysql = require('mysql');

var config_local = require('../db_config/config_local');

var DATE_TODAY = moment(new Date()).format("YYYY-MM-DD");

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var express = require("express");

var bodyParser = require("body-parser");

var connection = mysql.createConnection(config_local.localDatabaseOptions);


// create a rolling file logger based on date/time that fires process events

var opts = {

	errorEventName: "error",

	logDirectory: "SysLogs", // NOTE: folder must exist and be writable...

	fileNamePattern: "roll-<DATE>.log",

	dateFormat: "YYYY.MM.DD",

};

var log = require("simple-node-logger").createRollingFileLogger(opts);



var applctn = express();

applctn.use(bodyParser.json());


applctn.use(bodyParser.urlencoded({ extended: true }));

module.exports = function (app) {

	applctn.post("/hl7_message", function (req, res) {

		"use strict";


		var hl7_message = (req.body);

        //var hl7_message = {"MESSAGE_HEADER":{"SENDING_APPLICATION":"KENYAEMR","SENDING_FACILITY":"13939","RECEIVING_APPLICATION":"IL","RECEIVING_FACILITY":"13939","MESSAGE_DATETIME":"20210212090359","SECURITY":"","MESSAGE_TYPE":"SIU^S12","PROCESSING_ID":"P"},"PATIENT_IDENTIFICATION":{"EXTERNAL_PATIENT_ID":{"ID":"","IDENTIFIER_TYPE":"GODS_NUMBER","ASSIGNING_AUTHORITY":"MPI"},"INTERNAL_PATIENT_ID":[{"ID":"1393915477","IDENTIFIER_TYPE":"CCC_NUMBER","ASSIGNING_AUTHORITY":"CCC"}],"PATIENT_NAME":{"FIRST_NAME":"JOHN","MIDDLE_NAME":"OTIENO","LAST_NAME":"LUSI"},"MOTHER_NAME":{"FIRST_NAME":"","MIDDLE_NAME":"","LAST_NAME":""},"DATE_OF_BIRTH":"","SEX":"","PATIENT_ADDRESS":{"PHYSICAL_ADDRESS":{"VILLAGE":"","WARD":"","SUB_COUNTY":"","COUNTY":"","GPS_LOCATION":"","NEAREST_LANDMARK":""},"POSTAL_ADDRESS":""},"PHONE_NUMBER":"","MARITAL_STATUS":"","DEATH_DATE":"","DEATH_INDICATOR":"","DATE_OF_BIRTH_PRECISION":""},"APPOINTMENT_INFORMATION":[{"APPOINTMENT_REASON":"","ACTION_CODE":"A","APPOINTMENT_PLACING_ENTITY":"KENYAEMR","APPOINTMENT_STATUS":"PENDING","APPOINTMENT_TYPE":"","APPOINTMENT_NOTE":"N/A","APPOINTMENT_DATE":"20210507","PLACER_APPOINTMENT_NUMBER":{"ENTITY":"KENYAEMR","NUMBER":""}}]}

        


    });  

    internetAvailable().then(function(){
        console.log("Internet available");

        //if online run cron job to post from local db to sync endpoints

        var send_results_job = schedule.scheduleJob("30 * * * * * ", function (fireDate) {

            // If internet push data from local to live

            var DATE_TODAY = moment(new Date()).format("YYYY-MM-DD H:m:s");

                console.log(DATE_TODAY);

                console.log(

                "This sync is supposed to run at => " +

                    DATE_TODAY +

                    "And FireDate => " +

                    fireDate +

                    " "

            );
    
            var connection = mysql.createConnection(config_local.localDatabaseOptions);
        
            connection.connect(function(err) {
                if (err){
        
                    console.log(err);
        
                } else {

                    //check unsent clients
                    connection.query("select * from clients where processed=0 ", function (err, results, fields) {
                        
                        if(err) {console.log(err)};
        
                        //console.log(results)

                        var test = results.forEach(result => {

                            axios.post("/hl7_sync_client", result)
                            .then(function (response){
                                console.log(response.body)

                                //update status of updated appointment
                                result = connection.query("update clients set processed ='1', date_processed ='"+DATE_TODAY+"'+send_log='" +response.data +"' where id="+result.id+" ")
                            })
                            .catch(function (error){

                                console.log(error)

                                //update appointment with error
                                result = connection.query("update clients set date_processed ='"+DATE_TODAY+"'send_log='" +error +"' where id="+result.id+" ")

                            })
                            
                        });
        
                    });	

                    //check unsent appointments
                    connection.query("select * from appointments where processed=0 ", function (err, results, fields) {
                        
                        if(err) {console.log(err)};
        
                        var test = results.forEach(result => {

                            axios.post("/hl7_sync_appointment", result)
                            .then(function (response){
                                console.log(response.body)

                                //update status of updated appointment
                                result = connection.query("update appointments set processed ='1', date_processed ='"+DATE_TODAY+"', send_log='" +response.data +"' where id="+result.id+" ")
                            })
                            .catch(function (error){

                                console.log(error)

                                //update appointment with error
                                result = connection.query("update appointments set date_processed ='"+DATE_TODAY+"', send_log='" +error +"' where id="+result.id+" ")

                            })
                            
                        });

                    });	
        
                } 
        
        
            });	

        });

        //if online post incoming requests to receiver

        //var hl7_message = {"MESSAGE_HEADER":{"SENDING_APPLICATION":"KENYAEMR","SENDING_FACILITY":"13939","RECEIVING_APPLICATION":"IL","RECEIVING_FACILITY":"13939","MESSAGE_DATETIME":"20210212090359","SECURITY":"","MESSAGE_TYPE":"SIU^S12","PROCESSING_ID":"P"},"PATIENT_IDENTIFICATION":{"EXTERNAL_PATIENT_ID":{"ID":"","IDENTIFIER_TYPE":"GODS_NUMBER","ASSIGNING_AUTHORITY":"MPI"},"INTERNAL_PATIENT_ID":[{"ID":"1393915477","IDENTIFIER_TYPE":"CCC_NUMBER","ASSIGNING_AUTHORITY":"CCC"}],"PATIENT_NAME":{"FIRST_NAME":"JOHN","MIDDLE_NAME":"OTIENO","LAST_NAME":"LUSI"},"MOTHER_NAME":{"FIRST_NAME":"","MIDDLE_NAME":"","LAST_NAME":""},"DATE_OF_BIRTH":"","SEX":"","PATIENT_ADDRESS":{"PHYSICAL_ADDRESS":{"VILLAGE":"","WARD":"","SUB_COUNTY":"","COUNTY":"","GPS_LOCATION":"","NEAREST_LANDMARK":""},"POSTAL_ADDRESS":""},"PHONE_NUMBER":"","MARITAL_STATUS":"","DEATH_DATE":"","DEATH_INDICATOR":"","DATE_OF_BIRTH_PRECISION":""},"APPOINTMENT_INFORMATION":[{"APPOINTMENT_REASON":"","ACTION_CODE":"A","APPOINTMENT_PLACING_ENTITY":"KENYAEMR","APPOINTMENT_STATUS":"PENDING","APPOINTMENT_TYPE":"","APPOINTMENT_NOTE":"N/A","APPOINTMENT_DATE":"20210507","PLACER_APPOINTMENT_NUMBER":{"ENTITY":"KENYAEMR","NUMBER":""}}]}
    
        var options = {
    
            method: "POST",
    
            url: "https://il.mhealthkenya.co.ke/hl7_message",
    
            headers: {
    
                "Content-Type": "application/json",
    
            },
    
            body:hl7_message,
    
            json: true,
    
        };
    
    
    
        request(options, function (error, response, body) {
    
            if (error) { console.log(error) }
    
            //console.log(response);
    
        });
        
    
    }).catch(function(error){
        console.log("No internet, saving data locally", error);

        //if offline push data from request to local db
        var hl7_message = {
            "MESSAGE_HEADER":{
            "SENDING_APPLICATION":"KENYAEMR",
            "SENDING_FACILITY":"11239",
            "RECEIVING_APPLICATION":"IL",
            "RECEIVING_FACILITY":"11239",
            "MESSAGE_DATETIME":"20210415070959",
            "SECURITY":"",
            "MESSAGE_TYPE":"ADT^A04",
            "PROCESSING_ID":"P"
            },
            "PATIENT_IDENTIFICATION":{
            "EXTERNAL_PATIENT_ID":{
            "ID":"",
            "IDENTIFIER_TYPE":"GODS_NUMBER",
            "ASSIGNING_AUTHORITY":"MPI"
            },
        "INTERNAL_PATIENT_ID":[
            {
            "ID":"556677",
            "IDENTIFIER_TYPE":"PATIENT_CLINIC_NUMBER",
            "ASSIGNING_AUTHORITY":"CCC"
            },
            {
            "ID":"6677338871",
            "IDENTIFIER_TYPE":"CCC_NUMBER",
            "ASSIGNING_AUTHORITY":"CCC"
            }
        ],
        "PATIENT_NAME":{
        "FIRST_NAME":"WAKUTEST",
        "MIDDLE_NAME":"",
        "LAST_NAME":"JAMAA"
        },
        "MOTHER_NAME":{
        "FIRST_NAME":"",
        "MIDDLE_NAME":"",
        "LAST_NAME":""
        },
        "DATE_OF_BIRTH":"19770615",
        "SEX":"M",
        "PATIENT_ADDRESS":{
        "PHYSICAL_ADDRESS":{
        "VILLAGE":"",
        "WARD":"",
        "SUB_COUNTY":"NTUNENE",
        "COUNTY":"MERU",
        "GPS_LOCATION":"",
        "NEAREST_LANDMARK":""
        },
        "POSTAL_ADDRESS":""
        },
        "PHONE_NUMBER":"",
        "MARITAL_STATUS":"",
        "DEATH_DATE":"",
        "DEATH_INDICATOR":"",
        "DATE_OF_BIRTH_PRECISION":"ESTIMATED"
        },
        "NEXT_OF_KIN":[
            {
            "NOK_NAME":{
            "FIRST_NAME":"",
            "MIDDLE_NAME":"",
            "LAST_NAME":""
            },
            "RELATIONSHIP":"",
            "ADDRESS":"",
            "PHONE_NUMBER":"",
            "SEX":"",
            "DATE_OF_BIRTH":"",
            "CONTACT_ROLE":""
            }
        ],
        "PATIENT_VISIT":{
        "VISIT_DATE":"20210415",
        "PATIENT_SOURCE":"OUTPATIENT",
        "HIV_CARE_ENROLLMENT_DATE":"20210415",
        "PATIENT_TYPE":""
        },
        }
        
        var DATE_TODAY = moment(new Date()).format("YYYY-MM-DD");

        var message_type = hl7_message.MESSAGE_HEADER.MESSAGE_TYPE;
        var SENDING_APPLICATION = hl7_message.MESSAGE_HEADER.SENDING_APPLICATION;
        var MESSAGE_DATETIME = hl7_message.MESSAGE_HEADER.MESSAGE_DATETIME;

        if (SENDING_APPLICATION === 'KENYAEMR' || SENDING_APPLICATION === 'ADT') {

            if (message_type == "ADT^A04" || message_type == "ADT^A08") {

                var GODS_NUMBER = hl7_message.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
                var CCC_NUMBER;
                var PATIENT_CLINIC_NUMBER;
                var SENDING_FACILITY = hl7_message.MESSAGE_HEADER.SENDING_FACILITY;
                var FIRST_NAME = hl7_message.PATIENT_IDENTIFICATION.PATIENT_NAME.FIRST_NAME;
                var MIDDLE_NAME = hl7_message.PATIENT_IDENTIFICATION.PATIENT_NAME.MIDDLE_NAME;
                var LAST_NAME = hl7_message.PATIENT_IDENTIFICATION.PATIENT_NAME.LAST_NAME;
                var DATE_OF_BIRTH = hl7_message.PATIENT_IDENTIFICATION.DATE_OF_BIRTH;
                var SEX;
                var PHONE_NUMBER;
                var MARITAL_STATUS;
                var PATIENT_SOURCE = hl7_message.PATIENT_VISIT.PATIENT_SOURCE;
                var ENROLLMENT_DATE = hl7_message.PATIENT_VISIT.HIV_CARE_ENROLLMENT_DATE;
                var PATIENT_TYPE = hl7_message.PATIENT_VISIT.PATIENT_TYPE;
                var GROUP_ID;
                var COUNTY = hl7_message.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.COUNTY;
                var SUB_COUNTY = hl7_message.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.SUB_COUNTY;
                var WARD = hl7_message.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.WARD;
                var VILLAGE = hl7_message.PATIENT_IDENTIFICATION.PATIENT_ADDRESS.PHYSICAL_ADDRESS.VILLAGE;
                var DEATH_DATE = hl7_message.PATIENT_IDENTIFICATION.DEATH_DATE;
                var DEATH_INDICATOR = hl7_message.PATIENT_IDENTIFICATION.DEATH_INDICATOR;

                var result = get_json(hl7_message);

                console.log(result);

                for (var i = 0; i < result.length; i++) {
                    var key = result[i].key;
                    var value = result[i].value;

                    if (key == "DATE_OF_BIRTH") {
                        var DoB = DATE_OF_BIRTH;
    
                        var year = DoB.substring(0, 4);
                        var month = DoB.substring(4, 6);
                        var day = DoB.substring(6, 8);
    
                        var today = DATE_TODAY;
    
                        var new_date = year + "-" + month + "-" + day;
                        var date_diff = moment(today).diff(
                            moment(new_date).format("YYYY-MM-DD"),
                            "days"
                        );
    
                        if (date_diff >= 5475 && date_diff <= 6935) {
                            GROUP_ID = "2";
                        }
                        if (date_diff >= 7300) {
                            GROUP_ID = "1";
                        }
                        if (date_diff <= 5110) {
                            GROUP_ID = "6";
                        }
                    } else if (key == "SEX") {
                        if (result[i].value == "F") {
                            SEX = "1";
                        } else {
                            SEX = "2";
                        }
                    } else if (key == "PHONE_NUMBER") {
                        PHONE_NUMBER = result[i].value;
                    } else if (key == "MARITAL_STATUS") {
                        if (result[i].value === "") {
                            MARITAL_STATUS = "1";
                        }
                        if (result[i].value == "D") {
                            MARITAL_STATUS = "3";
                        } else if (result[i].value == "M") {
                            MARITAL_STATUS = "2";
                        } else if (result[i].value == "S") {
                            MARITAL_STATUS = "1";
                        } else if (result[i].value == "W") {
                            MARITAL_STATUS = "4";
                        } else if (result[i].value == "C") {
                            MARITAL_STATUS = "5";
                        }
                    }
                    if (key == "ID") {
                        if (result[i + 1].value == "CCC_NUMBER") {
                            CCC_NUMBER = result[i].value;
                        }
                    }

                    if (key == "ID") {
                        if (result[i + 1].value == "PATIENT_CLINIC_NUMBER") {
                            PATIENT_CLINIC_NUMBER = result[i].value;
                        }
                    }
                }

                var enroll_year = ENROLLMENT_DATE.substring(0, 4);
                var enroll_month = ENROLLMENT_DATE.substring(4, 6);
                var enroll_day = ENROLLMENT_DATE.substring(6, 8);
                var new_enroll_date = enroll_year + "-" + enroll_month + "-" + enroll_day;

                if(DEATH_DATE === "") {
                    var new_death_date = null;
                } else {

                    var death_year = DEATH_DATE.substring(0, 4);
                    var death_month = DEATH_DATE.substring(4, 6);
                    var death_day = DEATH_DATE.substring(6, 8);
                    var new_death_date = death_year + "-" + death_month + "-" + death_day;

                }

                if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                    response = `Invalid CCC Number: ${CCC_NUMBER}`;
                    console.log(response);
                    return;
                }

                if (DEATH_DATE !== "" && DEATH_INDICATOR === "Y") {
                    DEATH_INDICATOR = "Deceased";
                } else if (DEATH_INDICATOR === "N") {
                    DEATH_INDICATOR = "Active";
                }

                connection.connect(function(err) {
                    if (err) {
                        console.log(err);
                        return;
                    } else {

                        var PROCESSED = 0;

                        if(new_death_date === null) {

                            var gateway_sql =
                            "Insert into clients (f_name,m_name,l_name,dob,clinic_number,patient_clinic_number,mfl_code,gender,marital,phone_no,GODS_NUMBER,group_id, SENDING_APPLICATION, PATIENT_SOURCE, db_source, enrollment_date, client_type, locator_county, locator_sub_county, locator_ward, locator_village, message_type, date_deceased, death_status, processed) VALUES ('" +
                            FIRST_NAME +
                            "', '" +MIDDLE_NAME +
                            "','" +LAST_NAME +
                            "','" +new_date +
                            "','" +CCC_NUMBER +
                            "','" +PATIENT_CLINIC_NUMBER +
                            "','" +SENDING_FACILITY +
                            "','" +SEX +
                            "','" +MARITAL_STATUS +
                            "','" +PHONE_NUMBER +
                            "','" +GODS_NUMBER +
                            "','" +parseInt(GROUP_ID) +
                            "','" +SENDING_APPLICATION +
                            "','" +PATIENT_SOURCE +
                            "','" +SENDING_APPLICATION +
                            "','" +new_enroll_date +
                            "','" +PATIENT_TYPE +
                            "','" +COUNTY +
                            "','" +SUB_COUNTY +
                            "','" +WARD +
                            "','" +VILLAGE +
                            "','" +message_type +
                            "'," +new_death_date + 
                            ",'" +DEATH_INDICATOR + 
                            "','" +PROCESSED +
                            "' )";

                        } else {

                            var gateway_sql =
                            "Insert into clients (f_name,m_name,l_name,dob,clinic_number,patient_clinic_number,mfl_code,gender,marital,phone_no,GODS_NUMBER,group_id, SENDING_APPLICATION, PATIENT_SOURCE, db_source, enrollment_date, client_type, locator_county, locator_sub_county, locator_ward, locator_village, message_type, date_deceased, death_status, processed) VALUES ('" +
                            FIRST_NAME +
                            "', '" +MIDDLE_NAME +
                            "','" +LAST_NAME +
                            "','" +new_date +
                            "','" +CCC_NUMBER +
                            "','" +PATIENT_CLINIC_NUMBER +
                            "','" +SENDING_FACILITY +
                            "','" +SEX +
                            "','" +MARITAL_STATUS +
                            "','" +PHONE_NUMBER +
                            "','" +GODS_NUMBER +
                            "','" +parseInt(GROUP_ID) +
                            "','" +SENDING_APPLICATION +
                            "','" +PATIENT_SOURCE +
                            "','" +SENDING_APPLICATION +
                            "','" +new_enroll_date +
                            "','" +PATIENT_TYPE +
                            "','" +COUNTY +
                            "','" +SUB_COUNTY +
                            "','" +WARD +
                            "','" +VILLAGE +
                            "','" +message_type +
                            "','" +new_death_date + 
                            "','" +DEATH_INDICATOR + 
                            "','" +PROCESSED +
                            "' )";


                        }

                        
    
                        // Use the connection
                        connection.query(gateway_sql, function(error, results, fields) {
                            // And done with the connection.
                            if (error) {
    
                                console.log(error);
    
                            } else {
    
                                console.log(results);
    
                            }
                            // Don't use the connection here, it has been returned to the pool.
                        });

                    }
                });

            } else if (message_type == "SIU^S12") {
                var GODS_NUMBER = hl7_message.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
                var SENDING_FACILITY;
    
                var CCC_NUMBER;
                var APPOINTMENT_REASON;
                var APPOINTMENT_TYPE;
                var APPOINTMENT_DATE;
                var APPOINTMENT_PLACING_ENTITY;
                var PLACER_APPOINTMENT_NUMBER;
                var APPOINTMENT_LOCATION;
                //var ACTION_CODE;
                var APPOINTMENT_NOTE;
                var APPOINTMENT_HONORED;
                var VISIT_DATE;
    
                var result = get_json(hl7_message);
    
                for (var i = 0; i < result.length; i++) {
                    var key = result[i].key;
                    var key_value = result[i].value;
    
                    if (key == "NUMBER") {
                        PLACER_APPOINTMENT_NUMBER = result[i].value;
                    } else if (key == "GODS_NUMBER") {
                        GODS_NUMBER = result[i].value;
                    } else if (key == "APPOINTMENT_REASON") {
                        APPOINTMENT_REASON = result[i].value;
                    } else if (key == "APPOINTMENT_TYPE") {
                        APPOINTMENT_TYPE = result[i].value;
                    } else if (key == "VISIT_DATE") {
                        VISIT_DATE = result[i].value;
                    } else if (key == "APPOINTMENT_LOCATION") {
                        APPOINTMENT_LOCATION = result[i].value;
                    } else if (key == "APPINTMENT_HONORED") {
                        APPOINTMENT_HONORED = result[i].value;
                    } else if (key == "APPOINTMENT_NOTE") {
                        APPOINTMENT_NOTE = result[i].value;
                    } else if (key == "ACTION_CODE") {
                        ACTION_CODE = result[i].value;
                    } else if (key == "APPOINTMENT_PLACING_ENTITY") {
                        APPOINTMENT_PLACING_ENTITY = result[i].value;
                    } else if (key == "APPOINTMENT_DATE") {
                        APPOINTMENT_DATE = result[i].value;
                        APPOINTMENT_DATE = APPOINTMENT_DATE;
    
                        var year = APPOINTMENT_DATE.substring(0, 4);
                        var month = APPOINTMENT_DATE.substring(4, 6);
                        var day = APPOINTMENT_DATE.substring(6, 8);
    
                        var app_date = year + "-" + month + "-" + day;
    
                        var current_date = moment(new Date());
                        var today = current_date.format("YYYY-MM-DD");
    
                        var BirthDate = moment(app_date);
                        APPOINTMENT_DATE = BirthDate.format("YYYY-MM-DD");
                    }
                    
                    if (key == "ID") {
                        if (result[i + 1].value == "CCC_NUMBER") {
                            CCC_NUMBER = result[i].value;
                        }
                    }
                }
    
                if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                    console.log("Invalid CCC NUMBER");
                }
    
                if (!APPOINTMENT_TYPE) {
                    APPOINTMENT_TYPE = 1;
                }

                connection.connect(function(err, connection) {
                    if (err){

                        console.log(err);

                    } else {        
    
                        if (APPOINTMENT_LOCATION == "PHARMACY" || APPOINTMENT_REASON == "REGIMEN REFILL") {
                            APPOINTMENT_TYPE = 1;
                        } else {
                            APPOINTMENT_TYPE = 2;
                        }

                        var APP_STATUS = "Booked";
                        var ACTIVE_APP = "1";
                        var SENDING_APPLICATION = hl7_message.MESSAGE_HEADER.SENDING_APPLICATION;
                        var SENDING_FACILITY = hl7_message.MESSAGE_HEADER.SENDING_FACILITY;
                        var PROCESSED = 0;
                        
                        var appointment_sql =
                        "Insert into appointments (appntmnt_date,app_type_1,message_type,APPOINTMENT_REASON,app_status,db_source,active_app,APPOINTMENT_LOCATION,reason, placer_appointment_number, created_at, processed) VALUES ('" +
                        APPOINTMENT_DATE +
                        "','" +APPOINTMENT_TYPE +
                        "','" +message_type +
                        "','" +APPOINTMENT_REASON +
                        "','" +APP_STATUS +
                        "','" +SENDING_APPLICATION +
                        "','" +ACTIVE_APP +
                        "','" +APPOINTMENT_LOCATION +
                        "','" +APPOINTMENT_NOTE +
                        "','" +PLACER_APPOINTMENT_NUMBER +
                        "','" +VISIT_DATE +
                        "','" +PROCESSED +
                        "')";
                        // Use the connection
                        console.log(appointment_sql);
                        connection.query(appointment_sql, function(
                            error,
                            results,
                            fields
                        ) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log(results);
                            }
                            // And done with the connection.
                           // connection.end();

                            // Don't use the connection here, it has been returned to the pool.
                        });

                        
                    } 

                });	
                
            } else if(message_type === "ORU^R01") {

                var GODS_NUMBER = jsonObj.PATIENT_IDENTIFICATION.EXTERNAL_PATIENT_ID.ID;
                var CCC_NUMBER;
                var FIRST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.FIRST_NAME;
                var MIDDLE_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.MIDDLE_NAME;
                var LAST_NAME = jsonObj.PATIENT_IDENTIFICATION.PATIENT_NAME.LAST_NAME;
                var SENDING_APPLICATION = jsonObj.MESSAGE_HEADER.SENDING_APPLICATION;
                var SENDING_FACILITY = jsonObj.MESSAGE_HEADER.SENDING_FACILITY;
                var OBSERVATION_VALUE;
                var OBSERVATION_DATETIME;
                var MESSAGE_TYPE = jsonObj.MESSAGE_HEADER.MESSAGE_TYPE;

                var result = get_json(hl7_message);

                console.log(result);

                for (var i = 0; i < result.length; i++) {
                    var key = result[i].key;                
                    var value = result[i].value;
            
                    console.log(value)
            
                    if (key == "ID") {
                        if (result[i + 1].value == "CCC_NUMBER") {
                            CCC_NUMBER = result[i].value;
                        }
                    } else if(key = "OBSERVATION_IDENTIFIER") {
                        if (result[i - 5].value == "OBSERVATION_VALUE") {
                            OBSERVATION_VALUE = result[i].value;
                        }
                    } else if(key = "OBSERVATION_IDENTIFIER") {
                        if (result[i + 7].value == "OBSERVATION_DATETIME") {
                            OBSERVATION_DATETIME = result[i].value;
                        }
                    }
            
                }      

                if (CCC_NUMBER.length != 10 || isNaN(CCC_NUMBER)) {
                    response = `Invalid CCC Number: ${CCC_NUMBER}`;
                    console.log(response);
                    return;
                }

                connection.connect(function(err, connection) {
                    if (err) {
                        console.log(err);
                        return;
                    } else {
                        var gateway_sql =
                            "Insert into clients_oru(f_name,m_name,l_name,dob,clinic_number, message_type, mfl_code, SENDING_APPLICATION, observation_value,observation_datetime, observation_result) VALUES('" + 
                            FIRST_NAME +
                            "','" +LAST_NAME +
                            "','" +MIDDLE_NAME +
                            "','" +LAST_NAME +
                            "','" +CCC_NUMBER +
                            "','" +MESSAGE_TYPE +
                            "','" +SENDING_FACILITY +
                            "','" +SENDING_APPLICATION +
                            "','" +OBSERVATION_VALUE +
                            "','" +OBSERVATION_DATETIME +
                            "' )";

                        // Use the connection
                        connection.query(gateway_sql, function(error, results, fields) {
                            // And done with the connection.
                            if (error) {
    
                                console.log(error);
    
                            } else {
    
                                console.log(results);
                                connection.release();
    
                            }
                            // Don't use the connection here, it has been returned to the pool.
                        });    
                    }        

                });

            }    

        } else {

            console.log("IQCare Message, skip")
        }	

    });

	//Tell our app to listen on port 3000

	applctn.listen(1440, function (err) {

		if (err) {

			log.info(err);

		} else {

			console.log("T4A HL7 Consumer Server started on port 1440");

			log.info("T4A HL7 Consumer Server listening on port 1440");

		}

	});


	var j = schedule.scheduleJob("30 * * * * *", function (fireDate) {

		var DATE_TODAY = moment(new Date()).format("YYYY-MM-DD H:m:s");

		console.log(DATE_TODAY);

		console.log(

			"This cron job is supposed to run at => " +

				DATE_TODAY +

				"And FireDate => " +

				fireDate +

				" "

		);



		var getVirals = {

			method: "POST",

			url: "https://mlab.mhealthkenya.co.ke/api/get/il/viral_loads",

			headers: {

				"cache-control": "no-cache",

				"Content-Type": "application/json",

			},

			body: { mfl_code: 14080 },

			json: true,

		};



		request(getVirals, function (error, response, body) {

			if (error) { console.log(error) }

			if (Array.isArray(body)) {

				for (var i = 0; i < body.length; i++) {

					var data = body[i];

					var postToIL = {

						method: "POST",

						url: "http://127.0.0.1:3007/labresults/sms",

						headers: {

							"cache-control": "no-cache",

							"Content-Type": "application/json",

						},

						body: { message: data },

						json: true,

					};



					request(postToIL, function (error, response, res) {

						if (error) throw new Error(error);



						console.log(res);

					});

				}

			} else {

				console.log(body);

			}

		});

	});

};

//convert json object to key value pairs
function get_json(hl7_message) {
    var output = [];

    for (var x in hl7_message) {
        if (typeof hl7_message[x] === "object") {
            output = output.concat(get_json(hl7_message[x]));
        } else {
            output.push({
                key: x,
                value: hl7_message[x],
            });
        }
    }

    return output;
}