
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CommentSection = ({ projectId, taskId, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const fetchComments = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/backlog/${taskId}/comments`
      );
      setComments(res.data);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/projects/${projectId}/backlog/${taskId}/comments`,
        {
          author: currentUser?.fullName || "Anonymous",
          text,
        }
      );
      setText("");
      setComments([...comments, res.data]); // append new comment
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, taskId]);

  return (
    <div className="comments mt-3">
      <h6>Comments</h6>
      {comments.map((comment) => (
        <div key={comment.id}>
          <strong>{comment.author}</strong>: {comment.text}
        </div>
      ))}
      <form onSubmit={handleSubmit} className="mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="form-control"
        />
        <button type="submit" className="btn btn-sm btn-secondary mt-1">Add</button>
      </form>
    </div>
  );
};

export default CommentSection;