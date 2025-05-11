import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const searchWord = async (word) => {
  try {
    const response = await axios.get(`${API_URL}/word/${word}`);
    return response.data;
  } catch (error) {
    console.error('Error searching word:', error);
    throw error;
  }
};

export const searchByComponent = async (type, id) => {
  try {
    const response = await axios.get(`${API_URL}/search/${type}/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error searching by component:', error);
    throw error;
  }
};

export const getAllComponents = async (type) => {
  try {
    const response = await axios.get(`${API_URL}/components/${type}`);
    return response.data;
  } catch (error) {
    console.error('Error getting components:', error);
    throw error;
  }
}; 