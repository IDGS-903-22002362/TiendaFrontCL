interface ClubLeonBridge {
  postMessage: (message: string) => void;
}

interface TiendaAuthBridge {
  signInWithFirebase: (idToken: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearSession: () => Promise<void>;
  getAuthStatus: () => {
    isAuthenticated: boolean;
    token: string | null;
    user: unknown;
  };
}

declare global {
  interface Window {
    ClubLeonBridge?: ClubLeonBridge;
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
