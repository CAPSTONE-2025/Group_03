import React, { useState, useEffect } from 'react';

function HomePage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchHomeMessage = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/`);
        const data = await response.json();
        setMessage(data.message);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchHomeMessage();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="text-center">Home Page</h1>
      <p className="text-center">{message}</p>
    </div>
  );
}

export default HomePage;