# Continuous Organization smart-contracts specification
*Version 1.0* - *Last updated: Dec 6th 2019*

## Abstract

The goal of this wiki is to provide a reference specification for the smart-contract(s) implementing the continuous financing model described in the [continuous organizations whitepaper](https://github.com/c-org/whitepaper). The continuous financing model enables organizations to finance themselves in a permission-less and non-dilutive way by continuously issuing tokens called FAIR while aligning stakeholders to their financial success.

## c-org contract specifications

### A. States

On a high-level, the contract acts as a state machine with 3 states:

1. `init` state. The default state when the c-org contract is instantiated. In this state, the c-org is initializing and needs to sell a minimum amount of FAIR (`init_goal`) to switch to the `run` state. Only `beneficiary` is allowed to transfer tokens during this state. All other participants can only `buy()` or `sell()`.
2. `run` state. The c-org is running and accepting investments using the bonding curve contract model described [in the whitepaper](https://github.com/c-org/whitepaper).
3. `close` state. The c-org closing, paying out every FAIR holder and not accepting investments anymore. To close the c-org, the `beneficiary` needs to escrow the `exit_fee` and call the `close()` function.
4. `cancel` state. The c-org got cancelled (by calling `close()`) while still in `init` state.

### B. Structures

1. `init_investors`. A map with all investors in `init` state using `address` as a key and `amount` (in FAIR) as value. This structure's purpose is to make sure that only investors can withdraw their money if `init_goal` is not reached.

### C. Variables

#### C.1 constant variables

These variables are preset in the contract.

1. `currency`. The address of the token used as reserve in the bonding curve (i.e. the DAI contract). Use `ETH` if `0`.
2. `init_reserve`. The initial number of FAIR created at initialization for the `beneficiary`. Technically however, this variable is not a constant as we must always have `init_reserve>=total_supply+burnt_supply` which means that `init_reserve` will be automatically decreased to equal `total_supply+burnt_supply` in case `init_reserve>total_supply+burnt_supply` after an investor sells his FAIRs.
3. `init_goal`. The initial fundraising goal (*expressed in FAIR*) to start the c-org. `0` means that there is no initial fundraising and the c-org immediately moves to `run` state.
4. `buy_slope`. The buy slope of the bonding curve. Does not affect the financial model, only the granularity of FAIR.
5. `investment_reserve`. The investment reserve of the c-org. Defines the percentage of the value invested that is automatically funneled and held into the `buyback_reserve`.

#### C.2 updatable variables.

These variables are preset in the contract but can be altered under certain conditions once the contract is deployed. The variables can be updated using the `control` address. We highly recommend that this `control` address be a multisig to prevent unilateral modification of these variables.

1. `control`. The address from which the updatable variables (see below) can be updated. Defaults to the contract deployer.
2. `beneficiary`. The address of the beneficiary organization which receives the investments. Points to the wallet of the organization. Defaults to the contract deployer.
3. `auto_burn`. Set if the FAIRs minted by the organization when it commits its revenues are automatically burnt (`1`) or not (`0`). Defaults to `0` meaning that there is no automatic burn.
4. `fee`. The fee collected each time new FAIR are issued. Defaults to `0%`.
5. `fee_collector`. The address where fees are sent. Defaults to the contract deployer.
6. `min_investment`. The minimum investment accepted. Defaults to `100`.
7. `locked_until`. The minimum date before which the c-org contract cannot be closed once the contract has reached the `run` state. When updated, the new value of `locked_until` cannot be earlier than the previous `locked_until` and must be later than `now`.
8. `whitelist` refers to the contracts in charge of enforcing the legal restrictions related to the c-org (lock-up periods, no flow-back, transfer restrictions etc...).  The contract referred by `whitelist` is modeled after the [ERC-1404](https://erc1404.org) (with [one addition](https://github.com/Fairmint/c-org/blob/master/contracts/Whitelist.sol#L89)). Set whitelist to `0` if you don't want to enforce on-chain legal restrictions, we advise you to seek for legal advise before doing so. Just make sure you know what you're doing.
9. `revenue_commitment`. The "on-chain" revenue commitment of the organization. If the organization has its revenues off-chain, `revenue_commitment` is set to `0`. To protect investors, it is important to note that the revenue commitment can be increased but can never be decreased.

#### C.3 calculated variables.

These variables are the result of a calculation based on other variables. A key variable in the c-org model is the `sell_slope`, the sell slope of the bonding curve. It is actually not coded as a variable in this contract but is being calculated on demand (with `sell_slope=(2*buyback_reserve)/((total_supply+burnt_supply)^2)`) to avoid rounding issues. Other key variables non-coded are `issuance_price`, the current issuance price for FAIR which equals `(total_supply+burnt_supply-init_reserve)*buy_slope` and `buyback_price`, the current minimum buy-back price which equals `(total_supply+burnt_supply)*sell_slope + (sell_slope*burnt_supply^2)/(2*total_supply)`.

1. `state`. The current state of the contract: `0`=`init`, `1`=`run`, `2`=`close`. Unless `init_goal` equals `0`, default is `init` otherwise default is `run`. Once `init_goal` is reached, `state` changes to `run`. Finally `state` switches to `close` when `exit_fee` is paid.
2. `buyback_reserve`. The total amount of value currently locked in the buyback reserve. The `buyback_reserve` should be implemented as the current contract balance of the `currency` (instead of a separate variable).
3. `total_supply`. The total outstanding supply of FAIR issued, including the pre-minted FAIRs (see `init_reserve`) but *excluding* burnt FAIRs (see `burnt_supply`).
4. `burnt_supply`. The total number of FAIR burnt.

## D. Methods

### D.1 buy(amount, minimum, to)

Method called to [buy FAIR](https://github.com/c-org/whitepaper#buy). When `buy()` is called:

#### D.1.a state = `init`

When in `init` state, every investor receives tokens for the same price until `init_goal` is reached. `beneficiary` is the only one allowed to `transfer()` FAIRs from `init_reserve` if any (ideally using vesting schedules). The investor is the caller or `to` if specified. Note that `minimum` is discarded in `init` state.

0. If investor is not allowed to buy FAIR (see compliance below), then the function exits.
1. If `amount < min_investment`, then the function exits.
2. If `amount > (buy_slope*init_goal)*(init_goal-total_supply+init_reserve)/2` then
      1. `next_amount=amount - (buy_slope*init_goal)*(init_goal-total_supply+init_reserve)/2`
      2. `amount=amount - next_amount`
3. if `next_amount>0` then `additional_tokens=((2*next_amount/buy_slope)+init_goal^2)^(1/2)-init_goal` else `additional_tokens=0`
4. Add `x` to the investor's balance with `x=2*amount/(buy_slope*init_goal)+additional_tokens`.
4. Increase `total_supply` with `x` new FAIRs.
5. Add `amount` to the `buyback_reserve`.
6. Save investor's total investment in `init_investors[address]+=x`.
7. If `total_supply - init_reserve >= init_goal`, then:
    1. `state=run`.
    2. calculate the amount `y` invested by the beneficiary during init with `y=init_investors[beneficiary]*buy_slope*init_goal/2`
    3. send `(buyback_reserve-y)*(1-investment_reserve)*(1-fee)` to the `beneficiary`
    4. send `(buyback_reserve-y)*(1-investment_reserve)*fee` to the `fee_collector`
    5. update `buyback_reserve = investment_reserve * (buyback_reserve-y) + y`

#### D.1.b state = `run`

1. If the investor is not allowed to buy FAIR (see compliance), then the function exits.
2. If `amount < min_investment`, then the function exits.
3. Calculate the number of FAIR `x` that the investor should receive for his investment with `x=sqrt((2*amount/buy_slope)+(total_supply-init_reserve+burnt_supply)^2)-(total_supply-init_reserve+burnt_supply)`.
4. If `x < minimum` then the call fails. This is a protection against large price movements and front-running attacks.
5. Add `x` FAIRs to the investor's balance.
6. Increase `total_supply` with `x` new FAIRs.
7. If the investor is the `beneficiary`, then:
    1. if `auto_burn==1` then `burn(x)` is called.
    2. the full `amount` is added to the `buyback_reserve`.
8. If the investor is not the `beneficiary`, then:
    1. `investment_reserve*amount` is being added to the `buyback_reserve`
    2. `(1-investment_reserve)*amount*(1-fee)` is being transfered to `beneficiary`.
    3. `(1-investment_reserve)*amount*fee` is being sent to `fee_collector`

#### D.1.b state = `close`

The `buy()` functions fails in `close` state.

### D.2 sell(amount, minimum)

Method called to [sell FAIR](https://github.com/c-org/whitepaper#sell). It is important to note that `beneficiary` is only allowed to sell in `close` state or `cancel` state, `beneficiary` *cannot* sell in any other state. When `sell()` is called:

#### D.2.a state = `init`

In `init` state, the `minimum` parameter is ignored.

0. If `address == beneficiary`, then the function exits.
1. If `init_investors[address]` does not exists, then the function exits. Prevents the receivers of free FAIR from `init_reserve` to sell them at this time.
2. If `init_investors[address]<amount` then the call fails. Prevents the receivers of free FAIR from `init_reserve` to sell them at this time.
3. `amount` is being substracted from the investor's balance.
4. The investor receives `x` collateral value from the `buyback_reserve` with `x=amount*buyback_reserve/(total_supply-init_reserve)`.
5. Save investor's total withdrawal in `init_investors[address]-=amount`.
6. The `total_supply` is decreased of `amount` FAIRs.

#### D.2.b state = `run`

0. If `address == beneficiary`, then the function exits.
1. If `init_goal=0 && buyback_reserve=0`, then the function exits.
2. The collateral value `x` that the investor should receive from the buyback reserve is calculated with `x=(total_supply+burnt_supply)*amount*sell_slope-((sell_slope*amount^2)/2)+(sell_slope*amount*burnt_supply^2)/(2*(total_supply))` with `sell_slope=(2*buyback_reserve)/((total_supply+burnt_supply)^2)`.
3. If `x < minimum` then the call fails.
4. `amount` is being substracted from the investor's balance if it is superior or equal to `amount`. Otherwise the call fails.
5. The investor receives `x` collateral value from the buyback reserve
6. Substract `amount` FAIRs from `total_supply` to remove the sold FAIRs from the outstanding supply.
7. If `init_reserve>total_supply+burnt_supply` then set `init_reserve=total_supply+burnt_supply`

#### D.2.c state = `close`

In `close` state, the `minimum` parameter is ignored.

1. `amount` is being substracted from the investor's balance if their balance is superior or equal to `amount`. Otherwise the call fails.
2. The investor receives `x` collateral value from the buyback reserve with `x=buyback_reserve*amount/total_supply`.
3. Substract `amount` FAIRs from `total_supply` to remove the sold FAIRs from the outstanding supply.

#### D.2.d state = `cancel`

In `cancel` state, the `minimum` parameter is ignored.

1. If `init_investors[address]` does not exists, then the function exits. Prevents the receivers of free FAIR from `init_reserve` to sell them at this time.
2. If `init_investors[address]<amount` then the call fails. Prevents the receivers of free FAIR from `init_reserve` to sell them at this time.
3. `amount` is being substracted from the investor's balance.
4. The investor receives `x` collateral value from the `buyback_reserve` with `x=amount*buyback_reserve/(total_supply-init_reserve)`.
5. Save investor's total withdrawal in `init_investors[address]-=amount`.
6. The `total_supply` is decreased of `amount` FAIRs.

### D.3 burn(amount)

Method called to [burn FAIR](https://github.com/c-org/whitepaper#burn). When `burn()` is called:

1. If `state != 'run'` then the function exits.
2. Burn `amount` FAIRs by adding `amount` to `burnt_supply`.
3. Substract `amount` from `total_supply`

The `burn()` method fails during `init`, `close` and `cancel` states.

### D.4 pay(amount,to)

Method called to [pay the organization on-chain](https://github.com/c-org/whitepaper#pay). This is the `payable` method call when a transaction is sent to the c-org contract. If `to` is specified and `to` is allowed to receive FAIRs, then `to` should receive the newly minted FAIRs. In the case where `to` is not specified, the new FAIRs go to `beneficiary`. When `pay()` is called:

1. If `state != 'run'` then the function exits.
2. `revenue_commitment*amount` is being added to the `buyback_reserve` and `(1-revenue_commitment)*amount` is being transfered to the `beneficiary`.
3. Calculate `x` the number of newly issued FAIRs with `x=sqrt((2*revenue_commitment*amount/buy_slope)+(total_supply+burnt_supply)^2)-(total_supply+burnt_supply)`.
4. If `to` is specified, then  if `to` is allowed to receive FAIRs,`x` FAIRs are added to the `to` address specified, otherwise the function fails. If `to` is *not* specified, `x` FAIRs are added to the `beneficiary`'s balance.
5. The `total_supply` is increased with `x` new FAIRs.
6. If `(auto_burn==1 && to==beneficiary)` then `burn(x)` is called.

The `pay()` method fails during `init`, `close` and `cancel` states.

### D.5 close()

Method called to close the c-org contract. To close the c-org contract, the `beneficiary` needs to pay an `exit_fee = total_supply*(total_supply+burnt_supply)*buy_slope - buyback_reserve`.

1. If `address != beneficiary` then the function exits.
2. If `state == 'close' OR state == 'cancel'` then the function exits.
3. If `state == 'init'` then `state = 'cancel'`
4. If `state == 'run'` and `now > locked_until` then
    1. if `balanceOf(beneficiary) < (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply - buyback_reserve` then the function exits.
    2. `state = 'close'`.
    3. substract `(total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply - buyback_reserve` from the balance of `beneficiary`.
    4. `buyback_reserve = (total_supply^2 * buy_slope)/2 + burnt_supply*buy_slope*total_supply`.

## F. Important disclaimer

The c-org contract is highly sensitive due to the funds it holds in its reserve and due to the potential number of investors it coordinates. Fairmint is committed to provide the community with c-org contracts of the highest quality and providing the highest security. It is expected that other contracts respecting the below specification will be developed by third-parties. If you are a developer developing a c-org contract on any blockchain, please get in touch with us to make sure we DO NOT release buggy or deceptive contracts on the market. Likewise, if you are a user of a contract not developed or not audited techically, economically and legally by Fairmint, please be very cautious as you might put your money and the money of your investors at risk. Obviously, Fairmint offers no warranty and is not responsible nor liable for any of the contracts implementing this specification. Use them at your own risk.
