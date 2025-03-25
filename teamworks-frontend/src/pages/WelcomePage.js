import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Adjust the path as needed

const WelcomePage = ({ setIsAuthenticated }) => {
    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-light  rounded"> {/* Added rounded class */}
                <div className="container-fluid"> {/* Added container-fluid for better spacing */}
                    <Link className="navbar-brand" to="/">
                        <img src={logo} width="180px" height="65px" className="d-inline-block align-top" alt="Logo" />
                    </Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav">
                            {/* Add navigation links here if needed */}
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="jumbotron text-center d-flex flex-column">
                    <h1 className="display-4">Welcome to TeamWorks!</h1>
                    <p className="lead">
                        Boost collaboration. Simplify workflows. Maximize productivity.
                    </p>
                    <hr className="my-4" />
                    <p>Streamline task management, track project progress, and keep your team aligned—all in one place.</p>
                    <p className="lead">
                        <Link className="btn btn-primary btn-lg" to="/signup" role="button">
                            Get Started Today
                        </Link>
                    </p>
                </div>
            </div>

        </>
    );
};

export default WelcomePage;