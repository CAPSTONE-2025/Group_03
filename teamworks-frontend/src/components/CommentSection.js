import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CommentSection = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const fetchComments = async () => {
    const res = await axios.get(`http://localhost:5000/api/comments/${taskId}`);
    setComments(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`http://localhost:5000/api/comments/${taskId}`, {
      author: "Gary Hu",
      text: text,
      timestamp: new Date().toISOString()
    });
    setText("");
    fetchComments();
  };

  useEffect(() => {
    fetchComments();
  }, []);

  return (
    <div className="comments">
      <h4>Comments</h4>
      {comments.map(comment => (
        <div key={comment.id}>
          <strong>{comment.author}</strong>: {comment.text}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." />
        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default CommentSection;
