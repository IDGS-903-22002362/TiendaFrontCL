interface ClubLeonBridge {
  postMessage: (message: string) => void;
}

interface ClubLeonWebkitBridge {
  messageHandlers?: {
    ClubLeonBridge?: ClubLeonBridge;
  };
}

interface TiendaAuthBridge {
  signInWithFirebase: (
    idToken: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearSession: (options?: { notifyNative?: boolean }) => Promise<void>;
  getAuthStatus: () => {
    isAuthenticated: boolean;
    token: string | null;
    user: unknown;
  };
}

declare global {
  interface Window {
    ClubLeonBridge?: ClubLeonBridge;
    ReactNativeWebView?: ClubLeonBridge;
    webkit?: ClubLeonWebkitBridge;
    __tiendaAuth?: TiendaAuthBridge;
  }

  namespace google.maps {
    interface PlacesLibrary {
      PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
    }
  }

  namespace google.maps.places {
    interface PlacePredictionSelectEvent extends Event {
      placePrediction: PlacePrediction;
    }
  }
}

export {};
