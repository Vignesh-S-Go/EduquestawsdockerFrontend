import axios from 'axios';
import React, { useState } from 'react';
import { Lock } from 'react-feather';
import ReCAPTCHA from 'react-google-recaptcha';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleCaptchaChange = (token: string | null) => {
    console.log("Captcha token:", token);
    setCaptchaToken(token);
  };

  // Function to store the token
  const storeToken = (token: string) => {
    localStorage.setItem('token', token);
    console.log('JWT Token stored:', token);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!captchaToken) {
      setMessage("Please complete the CAPTCHA");
      return;
    }

    // location
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const response = await axios.post('http://ec2-13-201-34-207.ap-south-1.compute.amazonaws.com:8081/api/users/login', {
            ...formData,
            captchaToken,
          });

          if (response.data.token) {
            storeToken(response.data.token); // Store the token
            setMessage('Login Successful');
            navigate('/dash');
          } else {
            setMessage('Email or password is incorrect');
          }
        } catch (error) {
          console.error('Error:', error);
          setMessage('Email or password is incorrect');
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("Turn on your location or off");
        } else {
          console.error("Error accessing location:", error.message);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Lock className="mx-auto h-12 w-12 text-indigo-600" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <ReCAPTCHA
                sitekey="6Lcu0tIrAAAAAB7w9zbnjygt8Q1ShOfh2b0vzU79" 
                onChange={handleCaptchaChange}
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign in
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-4 text-center text-sm text-red-600">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
