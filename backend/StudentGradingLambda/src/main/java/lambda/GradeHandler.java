package lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.*;
import com.amazonaws.services.dynamodbv2.document.spec.DeleteItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.amazonaws.services.dynamodbv2.document.ScanFilter;
import com.amazonaws.services.dynamodbv2.document.ScanOutcome;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class GradeHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    private final AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard().build();
    private final DynamoDB dynamoDB = new DynamoDB(client);
    private final Table gradeTable = dynamoDB.getTable("Grade");
    private final Table userTable = dynamoDB.getTable("User");
    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> headers = Map.of("Content-Type", "application/json");

        try {
            String path = (String) event.get("path");
            String method = (String) event.get("httpMethod");
            String body = (String) event.get("body");
            Map<String, Object> requestData = body != null ? mapper.readValue(body, Map.class) : new HashMap<>();

            if ("/auth/register".equals(path) && "POST".equalsIgnoreCase(method)) {
                return handleRegister(requestData, headers);
            } else if ("/auth/login".equals(path) && "POST".equalsIgnoreCase(method)) {
                return handleLogin(requestData, headers);
            } else if ("/grades".equals(path)) {
                return handleGrades(method, requestData, event, headers);
            }

            return buildResponse(400, headers, "{\"error\":\"Unsupported path/method\"}");

        } catch (Exception e) {
            return buildResponse(500, headers, "{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    private Map<String, Object> handleRegister(Map<String, Object> data, Map<String, String> headers) {
        String userId = UUID.randomUUID().toString(); 
        String password = (String) data.get("password");
        String email = (String) data.get("email");
        String name = (String) data.get("name");
        Boolean isProfessor = (Boolean) data.get("isProfessor");

        // Check if email already exists
        ItemCollection<ScanOutcome> scanOutcome = userTable.scan(new ScanFilter("email").eq(email));
        Iterator<Item> iterator = scanOutcome.iterator();
        if (iterator.hasNext()) {
            return buildResponse(409, headers, "{\"message\":\"Email already registered\"}");
        }

        userTable.putItem(new Item()
            .withPrimaryKey("user_id", userId)
            .withString("password", password)
            .withString("email", email)
            .withString("name", name)
            .withBoolean("isProfessor", isProfessor != null ? isProfessor : false));

        return buildResponse(200, headers, "{\"message\":\"User registered successfully\"}");
    }


    private Map<String, Object> handleLogin(Map<String, Object> data, Map<String, String> headers) {
        String email = (String) data.get("username");
        String password = (String) data.get("password");

        if (email == null || password == null) {
            return buildResponse(400, headers, "{\"message\":\"Email and password must be provided\"}");
        }

        // Scan the User table for matching email
        Map<String, AttributeValue> eav = new HashMap<>();
        eav.put(":email", new AttributeValue().withS(email));

        ScanRequest scanRequest = new ScanRequest()
                .withTableName("User")
                .withFilterExpression("email = :email")
                .withExpressionAttributeValues(eav);

        AmazonDynamoDB lowLevelClient = AmazonDynamoDBClientBuilder.standard().build();
        ScanResult scanResult = lowLevelClient.scan(scanRequest);

        if (scanResult.getItems().isEmpty()) {
            return buildResponse(401, headers, "{\"message\":\"Invalid email or password\"}");
        }

        Map<String, AttributeValue> userItem = scanResult.getItems().get(0);

        String storedPassword = userItem.get("password").getS();
        if (!password.equals(storedPassword)) {
            return buildResponse(401, headers, "{\"message\":\"Invalid email or password\"}");
        }

        String userId = userItem.get("user_id").getS();
        boolean isProfessorInDB = Boolean.TRUE.equals(userItem.get("isProfessor").getBOOL());

        // Check if client sent "isProfessor" claim in login request
        boolean clientIsProfessor = false;
        if (data.get("isProfessor") != null) {
            clientIsProfessor = Boolean.TRUE.equals(data.get("isProfessor"));
        }

        // If mismatch between database role and client request → block login
        if (isProfessorInDB != clientIsProfessor) {
            return buildResponse(403, headers, "{\"message\":\"Access denied: Invalid role login attempt\"}");
        }

        List<Map<String, Object>> coursesTaught = new ArrayList<>();
        List<Map<String, Object>> enrolledCourses = new ArrayList<>();
        
        Table courseTable = dynamoDB.getTable("Course");
        ItemCollection<ScanOutcome> courses = courseTable.scan();

        if (isProfessorInDB) {
            // If user is professor: get courses they teach
            for (Item course : courses) {
                String professorId = course.getString("professor_id");
                if (professorId != null && professorId.equals(userId)) {
                    Map<String, Object> courseInfo = new HashMap<>();
                    courseInfo.put("course_id", course.getString("course_id"));
                    courseInfo.put("course_name", course.getString("course_name"));
                    courseInfo.put("course_detail", course.getString("course_detail"));
                    courseInfo.put("enrolled_students", course.getString("enrolled_students"));
                    coursesTaught.add(courseInfo);
                }
            }
        } else {
        	Table gradeTable = dynamoDB.getTable("Grade");
            ItemCollection<ScanOutcome> grades = gradeTable.scan(new ScanFilter("student_id").eq(userId));
            Set<String> courseIds = new HashSet<>(); // to avoid duplicate course lookups
            Map<String, String> courseIdToScore = new HashMap<>();
            for (Item grade : grades) {
                String courseId = grade.getString("course_id");
                String score = grade.getString("grade");
                if (courseId != null) {
                    courseIdToScore.put(courseId, score);
                }
            }

            for (String courseId : courseIdToScore.keySet()) {
                Item courseItem = courseTable.getItem("course_id", courseId);
                if (courseItem != null) {
                    Map<String, Object> courseInfo = new HashMap<>();
                    courseInfo.put("course_id", courseItem.getString("course_id"));
                    courseInfo.put("course_name", courseItem.getString("course_name"));
                    courseInfo.put("grade", courseIdToScore.get(courseId));
                    enrolledCourses.add(courseInfo);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Login successful");
        result.put("user_id", userId);
        result.put("name", userItem.get("name").getS());
        result.put("email", userItem.get("email").getS());
        result.put("isProfessor", isProfessorInDB);
        
        if (!enrolledCourses.isEmpty()) {
            result.put("enrolled_courses", enrolledCourses);
        }

        

        if (!coursesTaught.isEmpty()) {
            result.put("courses_taught", coursesTaught);
        }

        try {
            return buildResponse(200, headers, mapper.writeValueAsString(result));
        } catch (Exception e) {
            return buildResponse(500, headers, "{\"error\":\"Login parsing error\"}");
        }
    }



    private Map<String, Object> handleGrades(String method, Map<String, Object> data, Map<String, Object> event, Map<String, String> headers) throws Exception {
        // Fetch user_id using email
    	Map<String, String> queryParams = (Map<String, String>) event.get("queryStringParameters");
        String email = (String) queryParams.get("email");
        if (email == null || email.isEmpty()) {
            return buildResponse(400, headers, "{\"error\":\"Email is required\"}");
        }
        
        ItemCollection<ScanOutcome> users = userTable.scan(new ScanFilter("email").eq(email));
        Iterator<Item> iterator = users.iterator();
        if (!iterator.hasNext()) {
            return buildResponse(404, headers, "{\"error\":\"User not found for the provided email\"}");
        }
        Item user = iterator.next();
        String userId = user.getString("user_id");

        switch (method.toUpperCase()) {
            case "POST":
            case "PUT":
            case "DELETE": {
                // Only professors can perform these actions
            	if (!Boolean.TRUE.equals(user.getBoolean("isProfessor"))) {
                    return buildResponse(403, headers, "{\"error\":\"Access denied: Professors only\"}");
                }
            }
        }

        switch (method.toUpperCase()) {
            case "POST": {
            	// Get student_id and course_id from input
                String studentId = (String) data.get("student_id");
                String courseId = (String) data.get("course_id");

                if (studentId == null || courseId == null || studentId.isEmpty() || courseId.isEmpty()) {
                    return buildResponse(400, headers, "{\"error\":\"student_id and course_id are required\"}");
                }

                // Scan Grade table to check if grade already exists for (student_id, course_id)
                ItemCollection<ScanOutcome> existingGrades = gradeTable.scan(
                    new ScanFilter("student_id").eq(studentId),
                    new ScanFilter("course_id").eq(courseId)
                );

                Iterator<Item> itr = existingGrades.iterator();
                if (itr.hasNext()) {
                    Item item = itr.next();
                    if (item != null && item.getString("grade") != "NA") { // Assuming you are checking if a "grade" field exists
                        // Grade already exists for this student and course
                        return buildResponse(409, headers, "{\"error\":\"Grade already exists for this student and course\"}");
                    }
                }

                // Otherwise, proceed to insert new grade
                ItemCollection<ScanOutcome> allItems = gradeTable.scan();
                int maxId = 0;
                for (Item item : allItems) {
                    int currentId = item.getInt("grade_id");
                    if (currentId > maxId) maxId = currentId;
                }
                int newId = maxId + 1;

                gradeTable.putItem(new Item()
                    .withPrimaryKey("grade_id", String.valueOf(newId))
                    .withString("student_id", studentId)
                    .withString("course_id", courseId)
                    .withString("grade", (String) data.get("grade")));

                return buildResponse(200, headers, "{\"message\":\"Grade added successfully\", \"grade_id\":" + newId + "}");

            }

            case "PUT": {
                String id = (String) data.get("grade_id");
                UpdateItemSpec spec = new UpdateItemSpec()
                    .withPrimaryKey("grade_id", id)
                    .withUpdateExpression("set student_id = :s, course_id = :c, grade = :g")
                    .withValueMap(new ValueMap()
                        .withString(":s", (String) data.get("student_id"))
                        .withString(":c", (String) data.get("course_id"))
                        .withString(":g", (String) data.get("grade")));
                gradeTable.updateItem(spec);
                return buildResponse(200, headers, "{\"message\":\"Grade updated\"}");
            }

            case "DELETE": {
            	String id = (String) data.get("grade_id");

                // Check if the grade item exists before deleting
                Item existingItem = gradeTable.getItem("grade_id", id);

                if (existingItem == null) {
                    return buildResponse(404, headers, "{\"message\":\"Grade ID not found\"}");
                }

                // Proceed to delete
                gradeTable.deleteItem(new DeleteItemSpec().withPrimaryKey("grade_id", id));
                return buildResponse(200, headers, "{\"message\":\"Grade deleted\"}");
            }

            case "GET": {                            	
                String studentId = userId;
                Boolean isProfessor = Boolean.valueOf(queryParams.get("isProfessor"));

                if (studentId == null || studentId.isEmpty()) {
                    return buildResponse(400, headers, "{\"error\":\"student_id is required for fetching grades\"}");
                }
                

                ItemCollection<ScanOutcome> items = gradeTable.scan(new ScanFilter("student_id").eq(studentId));
                List<Map<String, Object>> grades = new ArrayList<>();
                for (Item item : items) {
                    grades.add(Map.of(
                        "grade_id", item.getInt("grade_id"),
                        "course_id", item.getString("course_id"),
                        "grade", item.getString("grade")
                    ));
                }

                if (Boolean.TRUE.equals(isProfessor)) {
                	if (userId != null && !userId.startsWith("P")) {
                		return buildResponse(403, headers, "{\"error\":\"Access denied: Professors only\"}");
                	} 
                	String courseIdFromParams = (String) queryParams.get("course_id");
                	
                	// Professor: Filter grades based on their offered courses
                	Table courseTable = dynamoDB.getTable("Course");
                	
                	
                	if (courseIdFromParams == null) {
                        return buildResponse(400, headers, "{\"message\":\"Course ID must be provided\"}");
                    }
                	
                	Item courseItem = courseTable.getItem("course_id", courseIdFromParams);
                	String enrolledStudents= courseItem.getString("enrolled_students");

                	List<Map<String, Object>> studentsList = new ArrayList<>();
                	ItemCollection<ScanOutcome> scoreItems = gradeTable.scan(
                		    new ScanFilter("course_id").eq(courseIdFromParams)
                		);
                	Table userTable = dynamoDB.getTable("User");
                	for (Item grade : scoreItems) {
                	        String student_id = (String) grade.get("student_id");
                	        String grade_id = (String) grade.get("grade_id");
                	        String studentGrade = (String) grade.get("grade");
                	        
                	        // Fetch student's name from User table using studentId
                	        Item studentItem = userTable.getItem("user_id", student_id);
                	        
                	        if (studentItem != null) {
                	            String studentName = studentItem.getString("name");
                	            
                	            Map<String, Object> studentInfo = new HashMap<>();
                	            studentInfo.put("student_id", student_id);
                	            studentInfo.put("grade_id", grade_id);
                	            studentInfo.put("student_name", studentName);
                	            studentInfo.put("grade", studentGrade);
                	            studentsList.add(studentInfo);
                	    }
                	}

                	// Build the final response map
                	Map<String, Object> responseBody = new HashMap<>();
                	responseBody.put("enrolled_students", enrolledStudents);
                	responseBody.put("students", studentsList);

                	return buildResponse(200, headers, mapper.writeValueAsString(responseBody));

                } else {
                    // Student: Return all grades
                    return buildResponse(200, headers, mapper.writeValueAsString(grades));
                }
            }


            default:
                return buildResponse(405, headers, "{\"error\":\"Unsupported HTTP method\"}");
        }
    }


    private Map<String, Object> buildResponse(int statusCode, Map<String, String> headers, String body) {
        Map<String, String> corsHeaders = new HashMap<>();
        corsHeaders.put("Access-Control-Allow-Origin", "*"); // allow all origins
        corsHeaders.put("Access-Control-Allow-Headers", "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token");
        corsHeaders.put("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
        corsHeaders.putAll(headers); // merge any other headers

        return Map.of(
            "statusCode", statusCode,
            "headers", corsHeaders,
            "body", body
        );
    }
}
