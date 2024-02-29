const { expect } = require("chai");
const {
    loadFixture,
    time,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Scenario testing", function () {

    function helperConvert(number) {
        return number.toString() + "000000000000000000"
    }

    async function deployFixture() {
        const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        const LockAndClaimContract = await ethers.getContractFactory("LockAndClaim");
        const tokenContract = await ethers.getContractFactory("AirdropToken");

        const ONE_DAY_IN_SECS = 24 * 60 * 60;
        const now = await time.latest();
        const startTime = now + ONE_DAY_IN_SECS;
        const endTime = startTime +  ( ONE_DAY_IN_SECS * 2 );

        const tokenA = await tokenContract.deploy("tokenA", "A", helperConvert(1000000));
        const tokenB = await tokenContract.deploy("tokenB", "B", helperConvert(1000000));
        const LockAndClaim = await LockAndClaimContract.deploy(tokenA, tokenB, startTime, endTime);

        await tokenA.mint(owner.address, helperConvert(10000));
        await tokenB.mint(LockAndClaim, helperConvert(10000));
        await tokenA.approve(LockAndClaim, helperConvert(10000));

        return { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 };
    }

  it("Should NOT lock money before start time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await expect(LockAndClaim.lock(helperConvert(100))).to.be.revertedWith(
        "isValidLockTime:: Invalid timestamp"
      );
  });

  it("Should change settings before start time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await expect(LockAndClaim.setClaimDayLevel(15,25)).to.emit(LockAndClaim, "DayLevelChanged");
  });

  it("Should NOT change settings for non-admin", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await expect(LockAndClaim.connect(addr1).setClaimDayLevel(15,25)).to.be.revertedWith(
        "isAdmin:: Action restricted to admins only"
      );
   });

   it("Should NOT change settings after start time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await expect(LockAndClaim.setClaimDayLevel(15,25)).to.be.revertedWith(
        "canChangeSettings:: Invalid timestamp"
      );
   });

   it("Should lock money when it comes to start time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await expect(LockAndClaim.lock(helperConvert(100))).to.emit(LockAndClaim, "Lock");
   });

   it("Should NOT claim before end time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(100));

    await time.increaseTo(startTime + ONE_DAY_IN_SECS );

    await expect(LockAndClaim.claim()).to.be.revertedWith(
        "isValidClaimTime:: Invalid timestamp"
      );
   });

   it("Should get 0 claimable token balance before end time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(100));

    await time.increaseTo( endTime - 1);

    await expect(await LockAndClaim.getTotalClaimableToken(owner.address)).to.equal(0);

   });

   it("Should get the correct claimable token balance with view function getTotalClaimableToken ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(100));

    await time.increaseTo( endTime + 1);

    await expect(await LockAndClaim.getTotalClaimableToken(owner.address)).to.equal(helperConvert(100));

   });


   it("Should claim after end time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(100));

    await time.increaseTo( endTime + 1);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim");

   });

   it("Should NOT lock money after end time", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo( endTime + 1);

    await expect(LockAndClaim.lock(helperConvert(100))).to.be.revertedWith(
        "isValidLockTime:: Invalid timestamp"
      );

   });


   it("Should have no claimable token after claim", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(100));

    await time.increaseTo( endTime + 1);

    await LockAndClaim.claim();

    await expect(LockAndClaim.claim()).to.be.revertedWith(
        "claim:: No claimable token"
      );

   });

   it("Should claim 499 tokenB when 499 tokenA was locked with 1 day ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(499));

    await time.increaseTo( endTime + ONE_DAY_IN_SECS);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim").withArgs(helperConvert(499));;

   });


   it("Should claim 750 tokenB when 500 tokenA was locked with 1 day ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(500));

    await time.increaseTo( endTime + ONE_DAY_IN_SECS);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim").withArgs(helperConvert(750));;

   });

   it("Should claim 850 tokenB when 500 tokenA was locked with more than 10 day ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(500));

    await time.increaseTo( endTime + (ONE_DAY_IN_SECS * 10) + 1);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim").withArgs(helperConvert(850));;

   });

   it("Should claim 900 tokenB when 500 tokenA was locked with more than 20 day ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(500));

    await time.increaseTo( endTime + (ONE_DAY_IN_SECS * 20) + 1);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim").withArgs(helperConvert(900));;

   });

   it("Should claim 3900 tokenB when 2000 tokenA was locked with more than 10 day ", async function () {

    const { LockAndClaim, tokenA, tokenB, startTime, endTime, ONE_DAY_IN_SECS, owner, addr1 } = await loadFixture(deployFixture);

    await time.increaseTo(startTime);

    await LockAndClaim.lock(helperConvert(2000));

    await time.increaseTo( endTime + (ONE_DAY_IN_SECS * 10) + 1);

    await expect(LockAndClaim.claim()).to.emit(LockAndClaim, "Claim").withArgs(helperConvert(3900));;

   });
  
});