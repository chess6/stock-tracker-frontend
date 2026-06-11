import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

export async function fetchPillarProfile(ticker) {
  const url = API_ENDPOINTS.RESEARCH_PILLARS(ticker);
  const res = await axios.get(url);
  return res.data;
}

export async function fetchThesis(ticker) {
  const url = API_ENDPOINTS.RESEARCH_THESIS(ticker);
  const res = await axios.get(url);
  return res.data;
}
