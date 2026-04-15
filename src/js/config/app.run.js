function AppRun(AppConstants, $rootScope, $window) {
  'ngInject';

  // Auto-login: seed the JWT token so verifyAuth() will authenticate on startup
  if (!$window.localStorage[AppConstants.jwtKey]) {
    $window.localStorage[AppConstants.jwtKey] = 'maeve-static-jwt-token-2026';
  }

  // change page title based on state
  $rootScope.$on('$stateChangeSuccess', (event, toState) => {
    $rootScope.setPageTitle(toState.title);
  });

  // Helper method for setting the page's title
  $rootScope.setPageTitle = (title) => {
    $rootScope.pageTitle = '';
    if (title) {
      $rootScope.pageTitle += title;
      $rootScope.pageTitle += ' \u2014 ';
    }
    $rootScope.pageTitle += AppConstants.appName;
  };

}

export default AppRun;
