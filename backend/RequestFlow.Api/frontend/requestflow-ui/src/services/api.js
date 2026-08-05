import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5131/api";

const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ""),
  timeout: 15000,
  headers: {
    Accept: "application/json"
  }
});

api.interceptors.request.use(
  config => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
      FormData kullanıldığında Content-Type değerini
      Axios otomatik olarak multipart/form-data şeklinde
      oluşturmalıdır.
    */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  requestError => {
    return Promise.reject(requestError);
  }
);

api.interceptors.response.use(
  response => response,
  responseError => {
    return Promise.reject(responseError);
  }
);

export default api;