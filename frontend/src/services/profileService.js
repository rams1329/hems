import axios from 'axios';

const API_URL = 'http://localhost:8080';

export const uploadProfileImage = async (username, profileImage) => {
  const response = await axios.post(`${API_URL}/profile-image`, { username, profileImage });
  return response.data;
};

export const getProfileImage = async (username) => {
  const response = await axios.get(`${API_URL}/profile-image/${username}`);
  return response.data.profileImage;
}; 