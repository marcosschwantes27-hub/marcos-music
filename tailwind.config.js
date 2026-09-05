/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          base: "#121212",
          surface: "#181818",
          card: "#181818",
          elevated: "#242424",
          highlight: "#2a2a2a",
          press: "#000000",
          middark: "#1f1f1f",
          green: "#bbf902",
          greenHover: "#c8ff05",
          greenDark: "#9dce00",
          textBase: "#ffffff",
          textSubdued: "#b3b3b3",
          textBright: "#cbcbcb",
          textLight: "#fdfdfd",
          border: "#4d4d4d",
          borderLight: "#7c7c7c",
          negative: "#f3727f",
          warning: "#ffa42b",
          announcement: "#539df5",
        }
      },
      borderRadius: {
        'card': '8px',
        'standard': '6px',
        'subtle': '4px',
        'pill': '500px',
        'fullpill': '9999px',
      },
      boxShadow: {
        'spotify-heavy': 'rgba(0, 0, 0, 0.5) 0px 8px 24px',
        'spotify-medium': 'rgba(0, 0, 0, 0.3) 0px 8px 8px',
        'spotify-inset': 'rgb(18, 18, 18) 0px 1px 0px, rgb(124, 124, 124) 0px 0px 0px 1px inset',
        'spotify-focus': 'rgb(18, 18, 18) 0px 1px 0px, rgb(255, 255, 255) 0px 0px 0px 2px inset',
      },
      letterSpacing: {
        'spotify-button': '1.6px',
        'spotify-caps': '1.4px',
      },
      fontFamily: {
        spotify: [
          'SpotifyMixUI',
          'CircularSp',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        spotifyTitle: [
          'SpotifyMixUITitle',
          'CircularSp',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
