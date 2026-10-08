import axios from "axios"
const api= axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://coach-alb-1029412538.ap-south-1.elb.amazonaws.com"
})
export default api;
