const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Map of Exact English Text found in the codebase -> 't("namespace.key")' structure
// It must match what is physically present in the code files.
const replacements = {
  // App.tsx
  "options={{ tabBarLabel: 'Home' }}": "options={{ tabBarLabel: t('general.home') }}",
  "options={{ tabBarLabel: 'Streaming' }}": "options={{ tabBarLabel: 'Streaming' }}", // Unchanged maybe? Leave it.
  "options={{ tabBarLabel: 'Entertainment' }}": "options={{ tabBarLabel: t('general.entertainment') }}",
  "options={{ tabBarLabel: 'AI Hub' }}": "options={{ tabBarLabel: t('general.ai_hub') }}",
  "options={{ tabBarLabel: 'Profile' }}": "options={{ tabBarLabel: t('general.profile') }}",

  // AIScreen.tsx
  "Movie suggestions for today": "t('ai.movie_suggestions_today')",
  "Best horror movies": "t('ai.best_horror')",
  "Trending series": "t('ai.trending_series')",
  "Vietnamese movies": "t('ai.vn_movies')",
  "\"Hi, I'm AI Hub ✨. What movie are you looking for today?\"": "t('ai.hi_ai')",
  "'Hi, I\\'m AI Hub ✨. What movie are you looking for today?'": "t('ai.hi_ai')", // fallback
  "'Sorry, I am a bit busy. Please try again later.'": "t('ai.busy')",
  "'History cleared. What would you like to watch?'": "t('ai.history_cleared')",
  ">AI is thinking...<": ">{t('ai.thinking')}<",
  'placeholder="Ask about movies, actors..."': "placeholder={t('ai.ask_movies_actors')}",

  // Auth Screens
  "'Log In Google failed'": "t('auth.google_login_failed')",
  "'Could not get login session from Google'": "t('auth.no_google_session')",
  "'Google Play Services are not available on your device'": "t('auth.no_play_services')",
  "'Google Auth Error'": "t('auth.google_auth_error')",
  "'An error occurred'": "t('auth.error_occurred')",
  "'Please fill in email and password'": "t('auth.fill_email_password')",
  "'Log In failed'": "t('auth.login_failed')",
  "'Please fill in all information'": "t('auth.fill_all_info')",
  "'Password must be greater than 5 characters'": "t('auth.password_length')",
  "'Please check your email to verify your account before logging in'": "t('auth.check_email_verify')",
  "'Sign Up failed'": "t('auth.signup_failed')",
  "'Please enter your email'": "t('auth.enter_email')",
  "'Error sending request. Please try again later.'": "t('auth.error_sending_request')",

  ">Log In to watch thousands of movies<": ">{t('auth.login_to_watch')}<",
  ">Log In<": ">{t('auth.log_in')}<",
  ">Or<": ">{t('auth.or')}<",
  ">Continue with Google<": ">{t('auth.continue_with_google')}<",
  ">Don't have an account?<": ">{t('auth.no_account')}<",
  ">Sign Up<": ">{t('auth.sign_up')}<",
  ">Already have an account?<": ">{t('auth.already_have_account')}<",
  ">Create account • Dive into the movie world<": ">{t('auth.create_account')}<",
  ">Forgot Password<": ">{t('auth.forgot_password')}<",
  ">Back to Log In<": ">{t('auth.back_to_login')}<",
  ">Send recovery link<": ">{t('auth.send_recovery_link')}<",
  ">Remembered your password?<": ">{t('auth.remembered_password')}<",

  ">We have sent a password recovery link to your inbox. Please check your email (including spam folder).<": ">{t('auth.recovery_sent')}<",
  ">Enter your registered email. We will send you a link to reset your password.<": ">{t('auth.enter_registered_email')}<",

  // GameScreen
  "'Failed to load game data'": "t('game.failed_load_data')",
  "'Correct! 🎉'": "t('game.correct')",
  "'+10 NTN Points'": "'+10 ' + t('game.ntn_points')",
  "'Next'": "t('general.next')",
  "'Wrong 😢'": "t('game.wrong') + ' 😢'",
  "'The answer is: '": "t('game.answer_is') + ' '",
  "'Try another movie'": "t('game.try_another_movie')",
  "'Wrong'": "t('game.wrong')",
  "'Try again or check the hint below!'": "t('game.try_again_hint')",
  "Points<": " {t('game.points')}<",
  ">Guess the movie name!<": ">{t('game.guess_the_movie')}<",
  ">Can you guess this blockbuster from the blurry look?<": ">{t('game.can_you_guess')}<",
  ">💡 Hint 1: Released in ": ">{t('game.hint_1')} ",
  ">💡 Hint 2: Rating ": ">{t('game.hint_2')} ",
  'placeholder="Enter movie name..."': "placeholder={t('game.enter_movie_name')}",
  ">Skip<": ">{t('general.skip')}<",
  ">Check 🚀<": ">{t('game.check')}<",

  // HomeScreen
  "'Trailer not available for this movie.'": "t('home.trailer_not_available')",
  "'Cannot load Trailer right now.'": "t('home.cannot_load_trailer')",
  "'Unknown'": "t('general.unknown')",
  ">Season ": ">{t('general.season')} ",
  " - Episode ": " - {t('general.episode')} ",
  "'🔥 Trending Movies'": "t('home.trending_movies')",
  "'📺 Top TV Shows'": "t('home.top_tv_shows')",
  "'🔖 Your Watchlist'": "t('home.your_watchlist')",
  "'🚀 Coming Soon'": "t('home.coming_soon')",
  "'💥 Action & Thriller'": "t('home.action_thriller')",
  "'🌟 Anime & Animation'": "t('home.anime_animation')",
  "'👻 Horror & Thrills'": "t('home.horror_thrills')",
  "'❤️ Sweet Romance'": "t('home.sweet_romance')",
  "'🏆 Top Rated'": "t('home.top_rated')",
  ">🔥 Top Comments<": ">{t('home.top_comments')}<",
  " Upvotes<": " {t('home.upvotes')}<",
  ">⚡ Fresh Comments<": ">{t('home.fresh_comments')}<",
  ">Search movies...<": ">{t('home.search_movies')}<",
  ">Trailer<": ">{t('home.trailer')}<",
  ">Just now<": ">{t('home.just_now')}<",
  " mins ago'": " ' + t('home.mins_ago')",
  " hours ago'": " ' + t('home.hours_ago')",
  " days ago'": " ' + t('home.days_ago')",

  // PlayerScreen
  "'Change Server'": "t('player.change_server')",
  "'Select Audio / Subtitle'": "t('player.select_audio_sub')",
  ">🚀 Server 3 (Multi-language)<": ">{t('player.server_3')}<",
  "'Language'": "t('player.language')",
  "'Failed to change Server'": "t('player.failed_change_server')",
  "'Stream not available on Server 1. Please try Server 3.'": "t('player.stream_not_on_server_1')",
  "'Stream not available on Server 3. Please try again later.'": "t('player.stream_not_on_server_3')",
  "'Error loading stream! Network connection is unstable.'": "t('player.error_loading_stream')",

  "label=\"Home\"": "label={t('general.home')}",
  "label=\"Movies\"": "label={t('filter.movie')} ", // fallback
  "label=\"TV Shows\"": "label={t('filter.tv_show')} ",

  // DetailScreen
  ">Like<": ">{t('general.like')}<",
  ">Share<": ">{t('general.share')}<",
  '"Sorry, I cannot summarize at this time."': "t('ai.busy')",
  '"Summarizing..."': "t('ai.summarizing')",
  '"AI Hub Summary"': "t('ai.ai_hub_summary')",
  ">Find similar movies with AI ➔<": ">{t('ai.similar_movies_ai')}<",
  ">Cast<": ">{t('general.cast')}<",
  ">Similar Overview<": ">{t('ai.similar_overview')}<",

  // Settings & Help
  "'Account updated successfully!'": "t('profile.account_updated')",
  ">Linked email cannot be changed.<": ">{t('profile.email_linked')}<",
  ">Save changes<": ">{t('profile.save_changes')}<",
  'placeholder="Enter your name"': "placeholder={t('profile.enter_name')}",
  ">How can we help you?<": ">{t('profile.how_can_we_help')}<",
  ">NTN Support team is ready 24/7 to listen to your requests.<": ">{t('profile.support_ready')}<",
  ">Send Support Email 🚀<": ">{t('profile.send_email')}<",
  ">Frequently Asked Questions (FAQ)<": ">{t('profile.faq')}<",

  // Profile
  ">Account Settings<": ">{t('profile.account_settings')}<",
  ">Watchlist<": ">{t('profile.watchlist')}<",
  ">Watch History<": ">{t('profile.watch_history')}<",
  ">Help & Support<": ">{t('profile.help_support')}<",
  ">Theme Colors<": ">{t('profile.theme_colors')}<",
  ">Change Theme<": ">{t('profile.change_theme')}<",
  ">Account<": ">{t('profile.account')}<",
  ">Logout<": ">{t('profile.logout')}<",
  "'Are you sure you want to log out?'": "t('profile.logout_confirm')",

  // WatchlistButton
  "'Added to Watchlist!'": "t('watchlist.added')",
  "'Removed from Watchlist!'": "t('watchlist.removed')",
  "'Saved'": "t('general.saved')",
  "'Save'": "t('general.save')",

  // Search & Filters
  'placeholder="Search movies, series..."': "placeholder={t('search.search_movies_series')}",
  ">No matching movies found<": ">{t('search.no_movies_found')}<",
  ">Enter a movie name to search<": ">{t('search.enter_name_to_search')}<",
  ">Search History<": ">{t('search.search_history')}<",

  // Setup file additions
  "import { Ionicons } from '@expo/vector-icons';": "import { Ionicons } from '@expo/vector-icons';\nimport { useTranslation } from 'react-i18next';",
  "import React, { useState": "import React, { useState } from 'react';\nimport { useTranslation } from 'react-i18next';", 
  "import React, { useEffect, useState, useCallback": "import { useTranslation } from 'react-i18next';\nimport React, { useEffect, useState, useCallback",
  
  "export default function HomeScreen({ navigation }: any) {": "export default function HomeScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function ProfileScreen({ navigation }: any) {": "export default function ProfileScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function GameScreen({ navigation }: any) {": "export default function GameScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function DetailScreen({ route, navigation }: any) {": "export default function DetailScreen({ route, navigation }: any) {\n  const { t } = useTranslation();",
  "export default function SearchScreen({ navigation }: any) {": "export default function SearchScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function AIScreen() {": "export default function AIScreen() {\n  const { t } = useTranslation();",
  "export default function PlayerScreen({ route, navigation }: any) {": "export default function PlayerScreen({ route, navigation }: any) {\n  const { t } = useTranslation();",
  "export default function WatchlistButton({ movie, styleType = 'icon', onWatchlistUpdated }: any) {": "export default function WatchlistButton({ movie, styleType = 'icon', onWatchlistUpdated }: any) {\n  const { t } = useTranslation();",
  "export default function LoginScreen({ navigation }: any) {": "export default function LoginScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function RegisterScreen({ navigation }: any) {": "export default function RegisterScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function ForgotPasswordScreen({ navigation }: any) {": "export default function ForgotPasswordScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function SettingsScreen({ navigation }: any) {": "export default function SettingsScreen({ navigation }: any) {\n  const { t } = useTranslation();",
  "export default function HelpScreen({ navigation }: any) {": "export default function HelpScreen({ navigation }: any) {\n  const { t } = useTranslation();"
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(srcDir);

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  Object.keys(replacements).forEach(vn => {
    const en = replacements[vn];
    
    // We treat the keys as direct literal replacment in text
    if (content.includes(vn)) {
      content = content.replace(new RegExp(vn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), en);
      changed = true;
    }
  });

  if (changed) {
    // If it doesn't have useTranslation but we need it since we used t(
    if (content.includes("t('") && !content.includes("useTranslation")) {
        // very basic injection
        content = "import { useTranslation } from 'react-i18next';\n" + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Prepared i18n: ${path.basename(file)}`);
  }
});

console.log(`Total files translated: ${changedFiles}`);
