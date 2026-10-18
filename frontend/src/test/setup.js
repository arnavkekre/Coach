import '@testing-library/jest-dom';
if (!window.speechSynthesis) {
  window.speechSynthesis = {
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
  };
}
if (!window.SpeechSynthesisUtterance) {
  window.SpeechSynthesisUtterance = function (text) {
    this.text = text;
  };
}
if (!navigator.mediaDevices) {
  navigator.mediaDevices = {
    getUserMedia: async () => ({
      getTracks: () => [{ stop: () => {} }],
    }),
  };
}
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock-url';
}
