Template.newAdminFeatureKey.onCreated(function () {
  this.showForm = new ReactiveVar(false);
});

Template.newAdminFeatureKey.helpers({
  currentFeatureKey() {
    return globalDb.collections.featureKey.findOne();
  },

  showForm() {
    const instance = Template.instance();
    return instance.showForm.get();
  },

  hideFormCb() {
    const instance = Template.instance();
    return () => {
      instance.showForm.set(false);
    };
  },
});
