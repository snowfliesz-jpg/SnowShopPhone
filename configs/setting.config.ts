import Setting from "../models/setting.model";

export const getApiShipping = async () => {
  const setting = await Setting.findOne({
    key: "apiShipping"
  });
  return setting ? setting.data : null;
}

export const getApiPayment = async () => {
  const setting = await Setting.findOne({
    key: "apiPayment"
  });
  return setting ? setting.data : null;
}

export const getApiLoginSocial = async () => {
  const setting = await Setting.findOne({
    key: "apiLoginSocial"
  });

  if (setting && setting.data) {
    return setting.data;
  }

  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookCallbackUrl: process.env.FACEBOOK_CALLBACK_URL,
  };
}

export const getApiAppPassword = async () => {
  const setting = await Setting.findOne({
    key: "apiAppPassword"
  });
  return setting ? setting.data : null;
}

export const getGeneral = async () => {
  const setting = await Setting.findOne({
    key: "general"
  });
  return setting ? setting.data : null;
}