const lookupIdentityById = function (identityId) {
  const identity = Meteor.users.findOne({ _id: identityId });
  if (identity) {
    SandstormDb.fillInProfileDefaults(identity);
    SandstormDb.fillInIntrinsicName(identity);
    SandstormDb.fillInPictureUrl(identity);
    return identity;
  }

  return undefined;
};

const capDetails = function (cap) {

  let introducer = {};
  let ownerInfo = {};
  console.log(cap);
  if (cap.owner.grain !== undefined) {
    const grainId = cap.owner.grain.grainId;
    const grain = Grains.findOne(grainId);
    const grainTitle = grain && grain.title;
    const packageId = grain && grain.packageId;
    const pkg = packageId && globalDb.collections.packages.findOne(packageId);
    const appIcon = pkg && globalDb.iconSrcForPackage(pkg, "grain", globalDb.makeWildcardHost("static"));
    const introducerIdentityId = cap && cap.owner && cap.owner.grain && cap.owner.grain.introducerIdentity;
    const introducerIdentity = lookupIdentityById(introducerIdentityId);
    const grainOwnerIdentity = (introducerIdentityId === grain.identityId) ? undefined : lookupIdentityById(grain.identityId);

    introducer = {
      identity: introducerIdentity,
    };

    ownerInfo.grain = {
      _id: grainId,
      ownerIdentity: grainOwnerIdentity,
      title: grainTitle,
      pkg,
      appIcon,
    };
  } else if (cap.owner.webkey !== undefined) {
    ownerInfo.webkey = {
    };

    // Attempt (poorly) to divine the granter of this token.  Since we only have an account ID,
    // we can't properly specify an identity, but we can at least link to that user's account page.
    const requirements = cap.requirements;
    if (requirements.length === 1) {
      const req = requirements[0];
      if (req.userIsAdmin) {
        introducer.account = {
          userId: req.userIsAdmin, // the newAdminUserDetails route requires params like this
        };
      }
    }
  }

  return {
    _id: cap._id,
    revoked: cap.revoked,
    created: cap.created,
    introducer,
    ownerInfo,
  };
};

Template.newAdminNetworkCapabilities.onCreated(function () {
  this.adminApiTokensSub = this.subscribe("adminApiTokens", undefined);

  this.autorun(() => {
    const apiTokens = ApiTokens.find({
      $and: [
        {
          $or: [
            { "frontendRef.ipNetwork": { $exists: true } },
            { "frontendRef.ipInterface": { $exists: true } },
          ],
        },
        {
          "owner.grain": { $exists: true },
        },
      ],
    });
    const grainIds = apiTokens.map(token => token.owner.grain.grainId);
    if (this.adminGrainInfoSub) {
      this.adminGrainInfoSub.stop();
    }

    this.adminGrainInfoSub = this.subscribe("adminGrainInfo", grainIds);

    const packageIds = Grains.find({
      _id: {
        $in: grainIds,
      },
    }).map(grain => grain.packageId);
    if (this.adminPackagesSub) {
      this.adminPackagesSub.stop();
    }

    this.adminPackagesSub = this.subscribe("adminPackages", packageIds);

    const identityIds = apiTokens.map(token => token.owner.grain.introducerIdentity);
    if (this.adminIdentitiesSub) {
      this.adminIdentitiesSub.stop();
    }

    this.adminIdentitiesSub = this.subscribe("adminIdentities", identityIds);
  });
});

Template.newAdminNetworkCapabilities.helpers({
  ipNetworkCaps() {
    return ApiTokens.find({
      "frontendRef.ipNetwork": { $exists: true },
    }).map(capDetails);
  },

  ipInterfaceCaps() {
    return ApiTokens.find({
      "frontendRef.ipInterface": { $exists: true },
    }).map(capDetails);
  },
});

const identityMatchesNeedle = function (needle, identity) {
  const profile = identity && identity.profile;
  if (profile) {
    if (profile.handle.toLowerCase().indexOf(needle) !== -1) return true;
    if (profile.intrinsicName.toLowerCase().indexOf(needle) !== -1) return true;
    if (profile.name.toLowerCase().indexOf(needle) !== -1) return true;
    if (profile.service.toLowerCase().indexOf(needle) !== -1) return true;
  }

  return false;
};

const packageMatchesNeedle = function (needle, pkg) {
  const title = pkg && pkg.manifest && pkg.manifest.appTitle && pkg.manifest.appTitle.defaultText;
  return title.toLowerCase().indexOf(needle) !== -1;
};

const matchesCap = function (needle, cap) {
  // Check for matching name in the grain owner or the token creator's identity.
  // Check for matches in cap token ID, grain ID, or app ID, but only as a prefix.

  if (cap.introducer.identity) {
    if (identityMatchesNeedle(needle, cap.introducer.identity)) return true;
  }

  if (cap._id.toLowerCase().lastIndexOf(needle, 0) !== -1) return true;

  if (cap.ownerInfo.grain) {
    const grain = cap.ownerInfo.grain;
    if (grain.title.toLowerCase().indexOf(needle) !== -1) return true;
    if (identityMatchesNeedle(needle, grain.ownerIdentity)) return true;
    if (packageMatchesNeedle(needle, grain.pkg)) return true;
    if (grain._id.toLowerCase().lastIndexOf(needle, 0) !== -1) return true;
    if (grain.pkg.appId.toLowerCase().lastIndexOf(needle, 0) !== -1) return true;
  }

  if (cap.introducer.account) {
    if (cap.introducer.account.userId.toLowerCase().indexOf(needle) !== -1) return true;
  }

  return false;
};

Template.newAdminNetworkCapabilitiesSection.onCreated(function () {
  this.searchString = new ReactiveVar("");
  this.activeChecked = new ReactiveVar(true);
  this.revokedChecked = new ReactiveVar(false);

  this.formState = new ReactiveVar("default");
  this.message = new ReactiveVar("");

  this.compileMatchFilter = () => {
    const searchString = this.searchString.get();
    const searchKeys = searchString.toLowerCase()
        .split(" ")
        .filter((k) => { return k !== ""; });

    return function matchFilter(item) {
      if (searchKeys.length === 0) return true;
      return _.chain(searchKeys)
          .map((searchKey) => { return matchesCap(searchKey, item); })
          .reduce((a, b) => a && b)
          .value();
    };
  };

  this.currentFilter = () => {
    // Returns a function which maps an object as returned from capDetails into a Boolean value
    // (whether or not it should be displayed).
    const searchStringMatchFilter = this.compileMatchFilter();
    return (cap) => {
      if (cap.revoked) {
        if (!this.revokedChecked.get()) return false;
      } else {
        if (!this.activeChecked.get()) return false;
      }

      return searchStringMatchFilter(cap);
    };
  };
});

Template.newAdminNetworkCapabilitiesSection.helpers({
  filterString() {
    const instance = Template.instance();
    return instance.searchString.get();
  },

  filterCaps(caps) {
    const instance = Template.instance();
    const filteredCaps = caps.filter(instance.currentFilter());
    return filteredCaps;
  },

  callbacks() {
    const instance = Template.instance();
    // Passing this down through another template?  Better wrap it in another closure. :/
    return {
      onRevokeCap(capId) {
        instance.formState.set("submitting");
        Meteor.call("adminToggleDisableCap", undefined, capId, true, (err) => {
          if (err) {
            instance.formState.set("error");
            instance.message.set(err.message);
          } else {
            instance.formState.set("success");
            instance.message.set("Revoked capability.");
          }
        });
      },
    };
  },

  activeChecked() {
    const instance = Template.instance();
    return instance.activeChecked.get();
  },

  revokedChecked() {
    const instance = Template.instance();
    return instance.revokedChecked.get();
  },

  activeCount(caps) {
    return caps.filter((cap) => {
      return !cap.revoked && !cap.trashed;
    }).length;
  },

  revokedCount(caps) {
    return caps.filter((cap) => {
      return cap.revoked || cap.trashed;
    }).length;
  },

  hasSuccess() {
    const instance = Template.instance();
    return instance.formState.get() === "success";
  },

  hasError() {
    const instance = Template.instance();
    return instance.formState.get() === "error";
  },

  message() {
    const instance = Template.instance();
    return instance.message.get();
  },
});

Template.newAdminNetworkCapabilitiesSection.events({
  "input input[name=search-string]"(evt) {
    const instance = Template.instance();
    instance.searchString.set(evt.currentTarget.value);
  },

  "click input[name=active]"(evt) {
    const instance = Template.instance();
    instance.activeChecked.set(!instance.activeChecked.get());
  },

  "click input[name=revoked]"(evt) {
    const instance = Template.instance();
    instance.revokedChecked.set(!instance.revokedChecked.get());
  },
});

Template.newAdminNetworkCapabilitiesTableCapabilityRow.events({
  "click .actions button"(evt) {
    const instance = Template.instance();
    instance.data.callbacks.onRevokeCap && instance.data.callbacks.onRevokeCap(instance.data.capInfo._id);
  },
});
