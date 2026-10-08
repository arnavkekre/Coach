import axios from "axios"
const api= axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://coach-backend-env.eba-82exqwu5.ap-south-1.elasticbeanstalk.com"
})
export default api;
