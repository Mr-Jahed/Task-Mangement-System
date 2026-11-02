# Stage 1: Build the Spring Boot application
FROM eclipse-temurin:27-jdk AS build

WORKDIR /app

# Copy Maven wrapper and project files
COPY . .

# Build the application
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:27-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]