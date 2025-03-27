import { Label } from "components/ui/Label";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";
import React, { useContext, useEffect, useState } from "react";
import { useGame } from "features/game/GameProvider";
import { Button } from "components/ui/Button";
import { useActor } from "@xstate/react";
import * as AuthProvider from "features/auth/lib/Provider";
import { CONFIG } from "lib/config";
import { ButtonPanel, InnerPanel, OuterPanel } from "components/ui/Panel";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { secondsToString } from "lib/utils/time";
import { SUNNYSIDE } from "assets/sunnyside";
import {
  TWITTER_HASHTAGS,
  TWITTER_REWARDS,
  TwitterPostName,
} from "features/game/types/social";
import { getKeys } from "features/game/types/decorations";
import { ITEM_DETAILS } from "features/game/types/images";
import { TranslationKeys } from "lib/i18n/dictionaries/types";
import saveIcon from "assets/icons/save.webp";

const TWITTER_POST_DESCRIPTIONS: Record<TwitterPostName, TranslationKeys> = {
  FARM: "twitter.post.farm",
  WEEKLY: "twitter.post.weekly",
};

export const Twitter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { gameService, gameState } = useGame();
  const telegram = gameState.context.state.telegram;

  const { t } = useAppTranslation();

  return (
    <CloseButtonPanel onClose={onClose} container={OuterPanel}>
      <TwitterRewards />
    </CloseButtonPanel>
  );
};

const VERIFY_COOLDOWN_MS = 15 * 60 * 1000;

const TwitterRewards: React.FC = () => {
  const [selected, setSelected] = useState<TwitterPostName>();
  const { gameService, gameState } = useGame();
  const { authService } = useContext(AuthProvider.Context);
  const [authState] = useActor(authService);

  const { t } = useAppTranslation();

  const twitter = gameState.context.state.twitter;

  if (selected) {
    return (
      <TwitterPost name={selected} onClose={() => setSelected(undefined)} />
    );
  }

  return (
    <InnerPanel className="p-2  mt-1">
      <div className="flex gap-1 items-center mb-2">
        <Label type="vibrant">{t("twitter.share.earn")}</Label>
        {twitter?.isAuthorised && (
          <Label type="success" className="mr-2">
            {t("twitter.connected")}
          </Label>
        )}
      </div>

      <p className="text-xs mb-2 px-2">{t("twitter.rewards.description")}</p>
      {getKeys(TWITTER_REWARDS).map((key) => {
        // In last 7 days
        const hasCompleted =
          (twitter?.tweets?.[key]?.completedAt ?? 0) >
          Date.now() - 7 * 24 * 60 * 60 * 1000;

        return (
          <ButtonPanel
            className="mb-2"
            key={key}
            onClick={() => setSelected(key)}
          >
            <div className="flex flex-wrap justify-between">
              <div className="flex gap-1">
                {
                  // Loop through rewards and give label
                  getKeys(TWITTER_REWARDS[key].items).map((name) => (
                    <Label
                      type="warning"
                      key={name}
                      icon={ITEM_DETAILS[name].image}
                    >
                      {`${name} x ${TWITTER_REWARDS[key].items[name]}`}
                    </Label>
                  ))
                }
              </div>
              {hasCompleted && <Label type="success">{t("completed")}</Label>}
            </div>

            <div>
              <p className="text-xs my-1">
                {t(TWITTER_POST_DESCRIPTIONS[key])}
              </p>
            </div>
          </ButtonPanel>
        );
      })}
    </InnerPanel>
  );
};

const TwitterPost: React.FC<{ name: TwitterPostName; onClose: () => void }> = ({
  name,
  onClose,
}) => {
  const { gameService, gameState } = useGame();
  const { authService } = useContext(AuthProvider.Context);
  const [authState] = useActor(authService);

  const [showConfirm, setShowConfirm] = useState(false);

  const { t } = useAppTranslation();

  const twitter = gameState.context.state.twitter;

  if (!twitter?.isAuthorised) {
    return (
      <InnerPanel className="p-1  mt-1">
        <Label type="vibrant" className="mb-2">
          {t("twitter.share.earn")}
        </Label>
        <Button
          onClick={() => {
            const redirectUrl = `${CONFIG.API_URL}/oauth/twitter`;
            const nonce = gameState.context.oauthNonce;

            const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${CONFIG.TWITTER_CLIENT_ID}&redirect_uri=${redirectUrl}&scope=tweet.read%20users.read%20follows.read%20offline.access&state=${nonce}&code_challenge=challenge&code_challenge_method=plain`;

            window.location.href = url;
          }}
        >
          {t("twitter.connect")}
        </Button>
      </InnerPanel>
    );
  }

  if (!twitter.followedAt) {
    return (
      <InnerPanel className="p-1  mt-1">
        <Label type="vibrant" className="mb-2">
          {t("twitter.share.earn")}
        </Label>
        <div className="flex flex-wrap">
          <Button
            onClick={() => {
              // Navigate to official twitter account
              window.open("https://x.com/0xsunflowerland", "_blank");

              gameService.send("twitter.followed", {
                effect: {
                  type: "twitter.followed",
                },
                authToken: authState.context.user.rawToken as string,
              });
            }}
          >
            {t("twitter.follow")}
          </Button>
        </div>
      </InnerPanel>
    );
  }

  // return null;
  const cooldown =
    VERIFY_COOLDOWN_MS - (Date.now() - (twitter.verifiedPostsAt ?? 0));

  const hasCompleted =
    (twitter?.tweets?.FARM?.completedAt ?? 0) >
    Date.now() - 7 * 24 * 60 * 60 * 1000;

  if (showConfirm) {
    return (
      <InnerPanel className="p-2  mt-1">
        <Label type="default" className="mb-2">
          {t("twitter.verify.ready")}
        </Label>
        <p className="text-xs mb-2 mx-1">
          {t("twitter.verify.instructions", {
            hashtag: TWITTER_HASHTAGS[name],
          })}
        </p>
        <p className="text-xs mb-2 mx-1">{t("twitter.verify.click.button")}</p>
        <div className="flex gap-1">
          <Button onClick={() => setShowConfirm(false)}>{t("back")}</Button>
          <Button
            onClick={() => {
              gameService.send("twitter.posted", {
                effect: {
                  type: "twitter.posted",
                },
                authToken: authState.context.user.rawToken as string,
              });
            }}
          >
            {t("twitter.verify.button")}
          </Button>
        </div>
      </InnerPanel>
    );
  }

  const Component = TWITTER_COMPONENTS[name];

  // Stage 2 - testing only
  return (
    <InnerPanel className="p-2  mt-1">
      <Component />
      {cooldown > 0 && (
        <>
          <p className="text-xs mx-1 my-1">
            {t("twitter.verify.cooldown", {
              time: secondsToString(cooldown / 1000, { length: "short" }),
            })}
          </p>
        </>
      )}
      <div className="flex">
        <Button className="mr-1" onClick={onClose}>
          {t("back")}
        </Button>
        <Button
          disabled={cooldown > 0 || hasCompleted}
          onClick={() => {
            setShowConfirm(true);
          }}
        >
          {t("twitter.verify.button")}
        </Button>
      </div>
    </InnerPanel>
  );
};

const TwitterFarm: React.FC = () => {
  const { gameState } = useGame();
  const { t } = useAppTranslation();

  const twitter = gameState.context.state.twitter;

  // In last 7 days
  const hasCompleted =
    (twitter?.tweets?.FARM?.completedAt ?? 0) >
    Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <>
      <div className="flex  gap-1">
        <Label type="vibrant" className="mr-2">
          {t("twitter.farm.share")}
        </Label>
        <div className="flex flex-wrap justify-between">
          {hasCompleted ? (
            <Label type="success" className="mr-2">
              {t("completed")}
            </Label>
          ) : (
            <div className="flex gap-1">
              {
                // Loop through rewards and give label
                getKeys(TWITTER_REWARDS.FARM.items).map((name) => (
                  <Label
                    type="warning"
                    key={name}
                    icon={ITEM_DETAILS[name].image}
                  >
                    {`${name} x ${TWITTER_REWARDS.FARM.items[name]}`}
                  </Label>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <p className="text-xs mx-1 my-1">
        {t("twitter.farm.instructions.1", { hashtag: TWITTER_HASHTAGS.FARM })}
      </p>
      <p className="text-xs mx-1 mb-2">{t("twitter.farm.instructions.2")}</p>
    </>
  );
};

const TwitterWeekly: React.FC = () => {
  const { gameService, gameState } = useGame();
  const { t } = useAppTranslation();

  const [image, setImage] = useState<string>(
    SUNNYSIDE.announcement.flowerBanner,
  );

  const twitter = gameState.context.state.twitter;

  // In last 7 days
  const hasCompleted =
    (twitter?.tweets?.FARM?.completedAt ?? 0) >
    Date.now() - 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    // Generate Image
  }, []);

  return (
    <>
      <div className="flex  gap-1">
        <Label type="vibrant">{t("twitter.weekly.share")}</Label>
        <div className="flex flex-wrap justify-between">
          {hasCompleted ? (
            <Label type="success" className="mr-2">
              {t("completed")}
            </Label>
          ) : (
            <div className="flex gap-1">
              {
                // Loop through rewards and give label
                getKeys(TWITTER_REWARDS.WEEKLY.items).map((name) => (
                  <Label
                    type="warning"
                    key={name}
                    icon={ITEM_DETAILS[name].image}
                  >
                    {`${name} x ${TWITTER_REWARDS.WEEKLY.items[name]}`}
                  </Label>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <img src={image} className="w-full my-2" />
        <a
          // href={image}
          download={image}
          className="absolute bottom-2 right-2 h-12 w-12 "
        >
          <img src={SUNNYSIDE.icons.disc} className="w-full" />
          <div className="absolute inset-0 flex items-center justify-center w-full h-full">
            <img src={saveIcon} className="w-6" />
          </div>
        </a>
      </div>

      <p className="text-xs mx-1 my-1">
        {t("twitter.weekly.instructions.1", {
          hashtag: TWITTER_HASHTAGS.WEEKLY,
        })}
      </p>
      <p className="text-xs mx-1 mb-2">{t("twitter.weekly.instructions.2")}</p>
    </>
  );
};

const TWITTER_COMPONENTS: Record<TwitterPostName, React.FC> = {
  FARM: TwitterFarm,
  WEEKLY: TwitterWeekly,
};
