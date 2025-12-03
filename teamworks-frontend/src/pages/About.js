import React from 'react';

function AboutPage() {
  const teamMembers = [
    {
      name: 'Jimbert Manalo',
      role: 'Full Stack Developer',
      github: 'Jimbert12',
      email: 'jmanalo11@myseneca.ca',
      initial: 'J'
    },
    {
      name: 'Seongjun Kim',
      role: 'Full Stack Developer',
      github: 'skim477',
      email: 'skim477@myseneca.ca',
      initial: 'S'
    },
    {
      name: 'Gary Hu',
      role: 'Full Stack Developer',
      github: 'garyhch0702',
      email: 'chu34@myseneca.ca',
      initial: 'G'
    },
    {
      name: 'Fawad Arshad',
      role: 'Full Stack Developer',
      github: 'Bagglebob',
      email: 'farshad2@myseneca.ca',
      initial: 'F'
    }
  ];

  const features = [
    {
      icon: 'bi-check-circle',
      title: 'Task Management',
      description: 'Create, assign, and track tasks with deadlines and priorities for efficient execution.'
    },
    {
      icon: 'bi-people',
      title: 'Team Management',
      description: 'Define team roles (Admin, Member, Guest), assign tasks, and manage permissions and access control.'
    },
    {
      icon: 'bi-graph-up',
      title: 'Progress Tracking',
      description: 'Visualize project status with dashboards and reports. Track overdue, in-progress, and completed tasks.'
    },
    {
      icon: 'bi-bell',
      title: 'Real-Time Updates',
      description: 'Instant notifications for status changes and live collaboration features for faster decision-making.'
    },
    {
      icon: 'bi-kanban',
      title: 'Kanban Board',
      description: 'Drag-and-drop task management to track tasks across different progress stages (To-Do, In Progress, Completed).'
    },
    {
      icon: 'bi-calendar-range',
      title: 'Gantt Chart',
      description: 'Visualize and manage project timelines with interactive Gantt charts showing task dependencies and schedules.'
    },
    {
      icon: 'bi-calendar-event',
      title: 'Calendar View',
      description: 'View tasks and deadlines in a calendar format for better scheduling and time management.'
    },
    {
      icon: 'bi-shield-lock',
      title: 'Secure Authentication',
      description: 'Secure login/signup system with JWT authentication and profile management with role-based permissions.'
    }
  ];

  return (
    <div className="mb-5">
      {/* Hero Section with Background */}
      <div className="bg-primary text-white py-5 mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8 mx-auto text-center">
              <h1 className="display-3 fw-bold mb-3">
                <i className="bi bi-info-circle me-3"></i>
                About TeamWorks
              </h1>
              <p className="lead mb-0">
                A modern workflow and team management web application designed to improve collaboration and productivity.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Overview Section - Full Width */}
        <div className="row mb-5">
          <div className="col-lg-10 mx-auto">
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-3">What is TeamWorks?</h2>
              <div className="border-top border-primary border-3 mx-auto" style={{ width: '80px', marginTop: '-10px' }}></div>
            </div>
            <div className="p-4 bg-light rounded-3">
              <p className="fs-5 mb-3">
                <strong>TeamWorks</strong> is an advanced project and workflow management system designed to help teams collaborate efficiently. 
                It offers <strong>real-time task updates</strong>, <strong>team role assignments</strong>, and <strong>progress tracking</strong>, 
                making it ideal for startups, corporate teams, and freelancers.
              </p>
              <p className="text-muted mb-0">
                Our platform provides intuitive tools for managing tasks, tracking project progress, and facilitating team communication, 
                all in one centralized location.
              </p>
            </div>
          </div>
        </div>

        {/* Features Section - Alternating Layout */}
        <div className="mb-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Core Features</h2>
            <div className="border-top border-success border-3 mx-auto" style={{ width: '80px', marginTop: '-10px' }}></div>
          </div>
          
          <div className="row g-4">
            {features.map((feature, index) => (
              <div key={index} className="col-lg-6">
                <div 
                  className="d-flex align-items-start p-4 bg-white rounded shadow-sm h-100"
                  style={{ 
                    transition: 'all 0.3s ease',
                    borderLeft: '4px solid #0d6efd'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(8px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                  }}
                >
                  <div className="flex-shrink-0 me-4">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px' }}>
                      <i className={`${feature.icon} fs-4`}></i>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h4 className="fw-semibold mb-2">{feature.title}</h4>
                    <p className="text-muted mb-0">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Development Team Section - Horizontal Cards */}
        <div className="mb-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Meet Our Team</h2>
            <div className="border-top border-danger border-3 mx-auto" style={{ width: '80px', marginTop: '-10px' }}></div>
            <p className="text-muted mt-3">The talented developers behind TeamWorks</p>
          </div>
          
          <div className="row g-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div 
                  className="card h-100 border-0 shadow-sm text-center"
                  style={{ transition: 'all 0.3s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                  }}
                >
                  <div className="card-body p-4">
                    <div className="mb-3">
                      <div 
                        className="rounded-circle bg-gradient text-white d-inline-flex align-items-center justify-content-center mx-auto"
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          fontSize: '2.5rem', 
                          fontWeight: 'bold',
                          background: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)'
                        }}
                      >
                        {member.initial}
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-1">{member.name}</h5>
                    <p className="text-muted small mb-3">{member.role}</p>
                    <div className="d-flex justify-content-center gap-2">
                      <a 
                        href={`mailto:${member.email}`} 
                        className="btn btn-sm btn-outline-primary rounded-circle"
                        title={member.email}
                        style={{ width: '40px', height: '40px', padding: 0 }}
                      >
                        <i className="bi bi-envelope"></i>
                      </a>
                      <a 
                        href={`https://github.com/${member.github}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-dark rounded-circle"
                        style={{ width: '40px', height: '40px', padding: 0 }}
                      >
                        <i className="bi bi-github"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Section - Inline Style */}
        <div className="mb-5">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h2 className="fw-bold mb-3">
                <i className="bi bi-database text-success me-2"></i>
                Database Architecture
              </h2>
              <p className="text-muted mb-4">
                TeamWorks uses <strong>MongoDB</strong> as its primary database, providing flexible and scalable data storage. 
                The database is organized into three main collections that work together seamlessly.
              </p>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '50px', height: '50px', minWidth: '50px' }}>
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <div>
                    <strong className="d-block">Users Collection</strong>
                    <small className="text-muted">Stores user credentials, roles, and profile information</small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '50px', height: '50px', minWidth: '50px' }}>
                    <i className="bi bi-list-check"></i>
                  </div>
                  <div>
                    <strong className="d-block">Tasks Collection</strong>
                    <small className="text-muted">Manages tasks with assigned users, statuses, and metadata</small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="bg-info text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                       style={{ width: '50px', height: '50px', minWidth: '50px' }}>
                    <i className="bi bi-folder-fill"></i>
                  </div>
                  <div>
                    <strong className="d-block">Projects Collection</strong>
                    <small className="text-muted">Stores team information and project details</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="bg-light rounded-3 p-5 text-center">
                <i className="bi bi-database-fill text-success" style={{ fontSize: '5rem' }}></i>
                <h4 className="mt-3 mb-2">MongoDB</h4>
                <p className="text-muted mb-0">Flexible NoSQL database for scalable data management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action - Modern Style */}
        <div className="bg-gradient text-white rounded-4 p-5 text-center" 
             style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)' }}>
          <h3 className="fw-bold mb-3">
            <i className="bi bi-rocket-takeoff me-2"></i>
            Ready to Get Started?
          </h3>
          <p className="fs-5 mb-4 opacity-90">
            Start managing your projects more efficiently with TeamWorks today!
          </p>
          <a href="/" className="btn btn-light btn-lg px-5 rounded-pill">
            <i className="bi bi-house-door me-2"></i>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
