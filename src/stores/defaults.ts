import { StoreState } from '../types';

export const storeStateDefault: StoreState = {
  gamesList: [],
  gameSpecs: {
    imageIdToImage: {},
    elementIdToElement: {},
    gameSpecIdToGameSpec: {}
  },
  matchesList: [],
  userIdToInfo: {},
  phoneNumberToContact: {},
  myUser: {
    myName: '',
    myPhoneNumber: '',
    myCountryCode: 'US',
    myUserId: ''
  },
  signals: [],
  audioMute: false
};
