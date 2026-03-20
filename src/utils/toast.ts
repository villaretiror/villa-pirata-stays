let globalToastCallback: (msg: string) => void = () => { };

export const setToastCallback = (callback: (msg: string) => void) => {
  globalToastCallback = callback;
};

export const showToast = (msg: string) => globalToastCallback(msg);
