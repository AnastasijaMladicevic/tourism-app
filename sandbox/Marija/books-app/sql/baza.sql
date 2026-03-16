CREATE DATABASE book_tracker;
USE book_tracker;

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    author VARCHAR(255),
    rating INT,
    dateRead DATE
);
