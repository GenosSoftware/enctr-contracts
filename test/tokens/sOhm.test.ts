import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FakeContract, smock } from "@defi-wonderland/smock";

import {
    EncountrStaking,
    EncountrTreasury,
    EncountrERC20Token,
    EncountrERC20Token__factory,
    SEncountr,
    SEncountr__factory,
    GENCTR,
    EncountrAuthority__factory,
} from "../../typechain";

const TOTAL_GONS = 5000000000000000;
const ZERO_ADDRESS = ethers.utils.getAddress("0x0000000000000000000000000000000000000000");

describe("sEnctr", () => {
    let initializer: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let encountr: EncountrERC20Token;
    let sEnctr: SEncountr;
    let gEnctrFake: FakeContract<GENCTR>;
    let stakingFake: FakeContract<EncountrStaking>;
    let treasuryFake: FakeContract<EncountrTreasury>;

    beforeEach(async () => {
        [initializer, alice, bob] = await ethers.getSigners();
        stakingFake = await smock.fake<EncountrStaking>("EncountrStaking");
        treasuryFake = await smock.fake<EncountrTreasury>("EncountrTreasury");
        gEnctrFake = await smock.fake<GENCTR>("gENCTR");

        const authority = await new EncountrAuthority__factory(initializer).deploy(
            initializer.address,
            initializer.address,
            initializer.address,
            initializer.address
        );
        encountr = await new EncountrERC20Token__factory(initializer).deploy(authority.address);
        sEnctr = await new SEncountr__factory(initializer).deploy();
    });

    it("is constructed correctly", async () => {
        expect(await sEnctr.name()).to.equal("Staked ENCTR");
        expect(await sEnctr.symbol()).to.equal("sENCTR");
        expect(await sEnctr.decimals()).to.equal(9);
    });

    describe("initialization", () => {
        describe("setIndex", () => {
            it("sets the index", async () => {
                await sEnctr.connect(initializer).setIndex(3);
                expect(await sEnctr.index()).to.equal(3);
            });

            it("must be done by the initializer", async () => {
                await expect(sEnctr.connect(alice).setIndex(3)).to.be.reverted;
            });

            it("cannot update the index if already set", async () => {
                await sEnctr.connect(initializer).setIndex(3);
                await expect(sEnctr.connect(initializer).setIndex(3)).to.be.reverted;
            });
        });

        describe("setgENCTR", () => {
            it("sets gEnctrFake", async () => {
                await sEnctr.connect(initializer).setgENCTR(gEnctrFake.address);
                expect(await sEnctr.gENCTR()).to.equal(gEnctrFake.address);
            });

            it("must be done by the initializer", async () => {
                await expect(sEnctr.connect(alice).setgENCTR(gEnctrFake.address)).to.be.reverted;
            });

            it("won't set gEnctrFake to 0 address", async () => {
                await expect(sEnctr.connect(initializer).setgENCTR(ZERO_ADDRESS)).to.be.reverted;
            });
        });

        describe("initialize", () => {
            it("assigns TOTAL_GONS to the stakingFake contract's balance", async () => {
                await sEnctr
                    .connect(initializer)
                    .initialize(stakingFake.address, treasuryFake.address);
                expect(await sEnctr.balanceOf(stakingFake.address)).to.equal(TOTAL_GONS);
            });

            it("emits Transfer event", async () => {
                await expect(
                    sEnctr.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                )
                    .to.emit(sEnctr, "Transfer")
                    .withArgs(ZERO_ADDRESS, stakingFake.address, TOTAL_GONS);
            });

            it("emits LogStakingContractUpdated event", async () => {
                await expect(
                    sEnctr.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                )
                    .to.emit(sEnctr, "LogStakingContractUpdated")
                    .withArgs(stakingFake.address);
            });

            it("unsets the initializer, so it cannot be called again", async () => {
                await sEnctr
                    .connect(initializer)
                    .initialize(stakingFake.address, treasuryFake.address);
                await expect(
                    sEnctr.connect(initializer).initialize(stakingFake.address, treasuryFake.address)
                ).to.be.reverted;
            });
        });
    });

    describe("post-initialization", () => {
        beforeEach(async () => {
            await sEnctr.connect(initializer).setIndex(1);
            await sEnctr.connect(initializer).setgENCTR(gEnctrFake.address);
            await sEnctr.connect(initializer).initialize(stakingFake.address, treasuryFake.address);
        });

        describe("approve", () => {
            it("sets the allowed value between sender and spender", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                expect(await sEnctr.allowance(alice.address, bob.address)).to.equal(10);
            });

            it("emits an Approval event", async () => {
                await expect(await sEnctr.connect(alice).approve(bob.address, 10))
                    .to.emit(sEnctr, "Approval")
                    .withArgs(alice.address, bob.address, 10);
            });
        });

        describe("increaseAllowance", () => {
            it("increases the allowance between sender and spender", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                await sEnctr.connect(alice).increaseAllowance(bob.address, 4);

                expect(await sEnctr.allowance(alice.address, bob.address)).to.equal(14);
            });

            it("emits an Approval event", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                await expect(await sEnctr.connect(alice).increaseAllowance(bob.address, 4))
                    .to.emit(sEnctr, "Approval")
                    .withArgs(alice.address, bob.address, 14);
            });
        });

        describe("decreaseAllowance", () => {
            it("decreases the allowance between sender and spender", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                await sEnctr.connect(alice).decreaseAllowance(bob.address, 4);

                expect(await sEnctr.allowance(alice.address, bob.address)).to.equal(6);
            });

            it("will not make the value negative", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                await sEnctr.connect(alice).decreaseAllowance(bob.address, 11);

                expect(await sEnctr.allowance(alice.address, bob.address)).to.equal(0);
            });

            it("emits an Approval event", async () => {
                await sEnctr.connect(alice).approve(bob.address, 10);
                await expect(await sEnctr.connect(alice).decreaseAllowance(bob.address, 4))
                    .to.emit(sEnctr, "Approval")
                    .withArgs(alice.address, bob.address, 6);
            });
        });

        describe("circulatingSupply", () => {
            it("is zero when all owned by stakingFake contract", async () => {
                await stakingFake.supplyInWarmup.returns(0);
                await gEnctrFake.totalSupply.returns(0);
                await gEnctrFake.balanceFrom.returns(0);

                const totalSupply = await sEnctr.circulatingSupply();
                expect(totalSupply).to.equal(0);
            });

            it("includes all supply owned by gEnctrFake", async () => {
                await stakingFake.supplyInWarmup.returns(0);
                await gEnctrFake.totalSupply.returns(10);
                await gEnctrFake.balanceFrom.returns(10);

                const totalSupply = await sEnctr.circulatingSupply();
                expect(totalSupply).to.equal(10);
            });

            it("includes all supply in warmup in stakingFake contract", async () => {
                await stakingFake.supplyInWarmup.returns(50);
                await gEnctrFake.totalSupply.returns(0);
                await gEnctrFake.balanceFrom.returns(0);

                const totalSupply = await sEnctr.circulatingSupply();
                expect(totalSupply).to.equal(50);
            });
        });
    });
});
