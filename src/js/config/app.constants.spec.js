import angular from 'angular';
import 'angular-mocks';
import AppConstants from './app.constants';

describe('AppConstants', function () {

  // Register a minimal module with the constants so we can inject them
  beforeEach(function () {
    angular.module('test.constants', [])
      .constant('AppConstants', AppConstants);
  });

  beforeEach(angular.mock.module('test.constants'));

  it('should have appName equal to "Conduit"', angular.mock.inject(function (AppConstants) {
    expect(AppConstants.appName).toBe('Conduit');
  }));

  it('should have a jwtKey defined', angular.mock.inject(function (AppConstants) {
    expect(AppConstants.jwtKey).toBeDefined();
  }));

  it('should have an api URL defined', angular.mock.inject(function (AppConstants) {
    expect(AppConstants.api).toBeDefined();
  }));
});
