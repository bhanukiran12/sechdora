import axios from "axios";

const API = `/api`;

export async function getDocs(token) {
  const response = await axios.get(`${API}/docs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.docs || [];
}

export async function getDoc(docId, token) {
  const response = await axios.get(`${API}/docs/${docId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function createDoc(docData, token) {
  const response = await axios.post(`${API}/docs`, docData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function updateDoc(docId, docData, token) {
  const response = await axios.put(`${API}/docs/${docId}`, docData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

export async function deleteDoc(docId, token) {
  const response = await axios.delete(`${API}/docs/${docId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}
