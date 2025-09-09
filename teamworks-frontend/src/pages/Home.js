import React, { useState, useEffect } from 'react';

function HomePage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5001/')
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="text-center">Home Page</h1>
      <p className="text-center">{message}</p>
    </div>
  );
}

export default HomePage;