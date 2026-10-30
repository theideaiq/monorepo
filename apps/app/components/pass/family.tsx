"use client";

import { localized, planName } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { BabyIcon, HouseIcon, InboxIcon, UserPlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { GuardianCard } from "@/components/guardian-settings";
import { PageHeader } from "@/components/page-header";
import { DuoPanel } from "@/components/plus/duo";
import { SectionSpinner } from "@/components/states";
import { productHref } from "@/components/store/product-card";
import { useMyDuo } from "@/lib/duo";
import {
  baghdadToday,
  type FamilyProfile,
  familyErrorKey,
  isKidBirthday,
  useFamilyActions,
  useFamilyProfiles,
  useFamilyRequests,
  useMyFamilyAsks,
} from "@/lib/family";
import { useMyGuardian, useMyTeens } from "@/lib/guardian";
import { isLivePlan, useRentalAllowance } from "@/lib/plus-queries";
import { usePlans, usePlusSubscription, useProfile } from "@/lib/queries";
import { useQueue } from "@/lib/queue-queries";
import { useWishlist } from "@/lib/wishlist-queries";

const FamilyError = ({ error }: { readonly error: Error | null }) => {
  const t = useTranslations("app.pass.family.errors");
  return error ? (
    <p className="text-destructive text-sm" role="alert">
      {t(familyErrorKey(error))}
    </p>
  ) : null;
};

/** The plan's shared slots: "At home 1 of 2", and the plan. */
const SharedSlots = () => {
  const t = useTranslations("app.pass.family");
  const locale = useLocale();
  const subscription = usePlusSubscription();
  const plans = usePlans("plus").data ?? [];
  const allowance = useRentalAllowance().data;
  const plan = plans.find((item) => item.id === subscription.data?.plan_id);
  const member = isLivePlan(subscription.data?.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HouseIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("slots.title")}
        </CardTitle>
        <CardDescription>{t("slots.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {member && plan ? (
          <p className="font-medium text-pink-text">{planName(plan, locale)}</p>
        ) : null}
        {allowance && allowance.slots > 0 ? (
          <p>
            {t("slots.atHome", {
              slots: formatNumber(allowance.slots, locale),
              used: formatNumber(allowance.used, locale),
            })}
          </p>
        ) : (
          <p className="text-muted-foreground">{t("slots.none")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {member ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/plus/plan">{t("slots.plan")}</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/plus/plans">{t("slots.join")}</Link>
            </Button>
          )}
          {allowance && allowance.slots > 0 ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/pass/at-home">{t("slots.atHomeLink")}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

/** Requests from a linked teen, to approve into the queue or decline. */
const Requests = () => {
  const t = useTranslations("app.pass.family.requests");
  const locale = useLocale();
  const requests = useFamilyRequests().data ?? [];
  const teens = useMyTeens().data ?? [];
  const { decide } = useFamilyActions();
  // my_teens() has names, not ids: with one teen linked, it's theirs.
  const who = teens.length === 1 ? teens[0]?.teen_name : null;

  if (requests.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="family-requests" className="grid gap-3">
      <h2
        className="flex items-center gap-2 font-semibold text-lg"
        id="family-requests"
      >
        <InboxIcon aria-hidden="true" className="size-5 text-pink-text" />
        {t("title")}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {requests.map((request) => {
          const name = request.product
            ? localized(request.product, "name", locale)
            : "";
          return (
            <li
              className="flex flex-wrap items-center gap-3 p-4 text-sm"
              key={request.id}
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span>
                  {who
                    ? t("asked", { item: name, name: who })
                    : t("askedNoName", { item: name })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(request.created_at, locale)}
                  {request.product ? " · " : ""}
                  {request.product ? (
                    <Link
                      className="text-pink-text hover:underline"
                      href={productHref(request.product.slug)}
                    >
                      {t("see")}
                    </Link>
                  ) : null}
                </span>
              </span>
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ approve: true, request: request.id })
                }
                size="sm"
              >
                {t("approve")}
              </Button>
              <Button
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ approve: false, request: request.id })
                }
                size="sm"
                variant="ghost"
              >
                {t("decline")}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-xs">{t("note")}</p>
      <FamilyError error={decide.error} />
    </section>
  );
};

/**
 * Queue for a kid: an item already in the manager's queue, or one they
 * saved that's in Plus. 18+ items are refused by the database.
 */
const QueueForKid = ({ profile }: { readonly profile: FamilyProfile }) => {
  const t = useTranslations("app.pass.family.kids");
  const locale = useLocale();
  const id = useId();
  const queue = useQueue().items;
  const saved = useWishlist().data ?? [];
  const { queueFor } = useFamilyActions();
  const [product, setProduct] = useState("");
  const queued = new Set(queue.map((item) => item.product_id));
  const choices = [
    ...queue
      .filter((item) => item.for_profile !== profile.id && item.product)
      .map((item) => ({
        id: item.product_id,
        name: item.product ? localized(item.product, "name", locale) : "",
      })),
    ...saved
      .filter(
        (item) =>
          item.product?.rentable &&
          item.product.status === "active" &&
          !queued.has(item.product_id)
      )
      .map((item) => ({
        id: item.product_id,
        name: item.product ? localized(item.product, "name", locale) : "",
      })),
  ];
  if (choices.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        {t("nothingToQueue")}{" "}
        <Link className="text-pink-text underline" href="/plus">
          {t("browse")}
        </Link>
      </p>
    );
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={id}>{t("queueFor", { name: profile.name })}</Label>
          <Select onValueChange={setProduct} value={product}>
            <SelectTrigger className="w-full sm:w-64" id={id}>
              <SelectValue placeholder={t("choose")} />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice.id} value={choice.id}>
                  {choice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!product || queueFor.isPending}
          onClick={() =>
            queueFor.mutate(
              { product, profile: profile.id },
              { onSuccess: () => setProduct("") }
            )
          }
          size="sm"
          variant="outline"
        >
          {t("queue")}
        </Button>
      </div>
      {queueFor.isSuccess ? (
        <p className="text-sm" role="status">
          {t("queued", { name: profile.name })}
        </p>
      ) : null}
      <FamilyError error={queueFor.error} />
    </div>
  );
};

/** A kid's row: name, age, what's queued for them, Queue for, Remove. */
const KidRow = ({ profile }: { readonly profile: FamilyProfile }) => {
  const t = useTranslations("app.pass.family.kids");
  const locale = useLocale();
  const queue = useQueue().items;
  const { removeKid } = useFamilyActions();
  const [confirming, setConfirming] = useState(false);
  const theirs = queue.filter((item) => item.for_profile === profile.id);

  return (
    <li className="grid gap-3 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <BabyIcon aria-hidden="true" className="size-4 text-pink-text" />
        <span className="font-medium">{profile.name}</span>
        <Badge variant="outline">{t("kid")}</Badge>
        <span className="text-muted-foreground text-xs">
          {t("born", {
            date: formatDate(`${profile.birthday}T12:00:00`, locale),
          })}
        </span>
      </div>
      {theirs.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("inQueue", {
            items: theirs
              .map((item) =>
                item.product ? localized(item.product, "name", locale) : ""
              )
              .join(" · "),
          })}
        </p>
      ) : null}
      <QueueForKid profile={profile} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm">
            {t("removeConfirm", { name: profile.name })}
          </p>
          <Button
            disabled={removeKid.isPending}
            onClick={() => removeKid.mutate(profile.id)}
            size="sm"
            variant="destructive"
          >
            {t("remove")}
          </Button>
          <Button
            onClick={() => setConfirming(false)}
            size="sm"
            variant="ghost"
          >
            {t("keep")}
          </Button>
        </div>
      ) : (
        <Button
          className="justify-self-start text-destructive"
          onClick={() => setConfirming(true)}
          size="sm"
          variant="ghost"
        >
          {t("remove")}
        </Button>
      )}
      <FamilyError error={removeKid.error} />
    </li>
  );
};

/** Add a kid under 13: a name and a birthday, no sign-in. */
const AddKidForm = () => {
  const t = useTranslations("app.pass.family.add");
  const id = useId();
  const { addKid } = useFamilyActions();
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const today = baghdadToday();
  const valid = name.trim().length > 0 && isKidBirthday(birthday, today);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) {
      return;
    }
    addKid.mutate(
      { birthday, name: name.trim() },
      {
        onSuccess: () => {
          setName("");
          setBirthday("");
        },
      }
    );
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <p className="text-muted-foreground text-sm">{t("kidHelp")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>{t("name")}</Label>
          <Input
            autoComplete="off"
            className="w-48"
            id={`${id}-name`}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-birthday`}>{t("birthday")}</Label>
          <Input
            className="w-44"
            dir="ltr"
            id={`${id}-birthday`}
            max={today}
            onChange={(event) => setBirthday(event.target.value)}
            type="date"
            value={birthday}
          />
        </div>
        <Button disabled={!valid || addKid.isPending} type="submit">
          {addKid.isPending ? t("adding") : t("addKid")}
        </Button>
      </div>
      {birthday && !isKidBirthday(birthday, today) ? (
        <p className="text-muted-foreground text-xs">{t("over13")}</p>
      ) : null}
      {addKid.isSuccess ? (
        <p className="text-sm" role="status">
          {t("added")}
        </p>
      ) : null}
      <FamilyError error={addKid.error} />
    </form>
  );
};

type AddChoice = "kid" | "partner" | "teen";

/** "Add someone": a partner (the Duo invite), a teen (guardian code), a kid. */
const AddSomeone = () => {
  const t = useTranslations("app.pass.family.add");
  const duo = useMyDuo().data;
  const [choice, setChoice] = useState<AddChoice>("kid");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlusIcon aria-hidden="true" className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ToggleGroup
          aria-label={t("title")}
          onValueChange={(value) => value && setChoice(value as AddChoice)}
          type="single"
          value={choice}
          variant="outline"
        >
          <ToggleGroupItem value="kid">{t("kid")}</ToggleGroupItem>
          <ToggleGroupItem value="teen">{t("teen")}</ToggleGroupItem>
          <ToggleGroupItem value="partner">{t("partner")}</ToggleGroupItem>
        </ToggleGroup>
        {choice === "kid" ? <AddKidForm /> : null}
        {choice === "teen" ? (
          <p className="text-muted-foreground text-sm">{t("teenHelp")}</p>
        ) : null}
        {choice === "partner" && duo?.role === "holder" ? (
          <p className="text-muted-foreground text-sm">
            {t("partnerHelpHolder")}
          </p>
        ) : null}
        {choice === "partner" && duo?.role !== "holder" ? (
          <div className="grid justify-items-start gap-2">
            <p className="text-muted-foreground text-sm">{t("partnerHelp")}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/plus/plans">{t("seePlans")}</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

/** The people: you (the manager), the partner, teens and kids. */
const People = () => {
  const t = useTranslations("app.pass.family.people");
  const profile = useProfile().data;
  const kids = useFamilyProfiles();

  return (
    <section aria-labelledby="family-people" className="grid gap-4">
      <h2 className="font-semibold text-lg" id="family-people">
        {t("title")}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        <li className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <span className="font-medium">{profile?.full_name || t("you")}</span>
          <Badge variant="secondary">{t("manager")}</Badge>
        </li>
        {kids.data?.map((kid) => (
          <KidRow key={kid.id} profile={kid} />
        ))}
      </ul>
      {kids.isPending ? <SectionSpinner /> : null}
      <DuoPanel />
      <GuardianCard />
    </section>
  );
};

/** A linked teen asks for something they saved that's in Plus. */
export const AskToPlay = () => {
  const t = useTranslations("app.pass.family.ask");
  const locale = useLocale();
  const guardian = useMyGuardian().data;
  const saved = useWishlist().data ?? [];
  const asks = useMyFamilyAsks().data ?? [];
  const { ask } = useFamilyActions();
  const pending = new Set(
    asks
      .filter((item) => item.status === "pending")
      .map((item) => item.product_id)
  );
  const rentable = saved.filter(
    (item) => item.product?.rentable && item.product.status === "active"
  );

  if (!(guardian?.minor && guardian.status === "active")) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { name: guardian.guardian_name ?? "" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {rentable.length === 0 ? (
          <p className="text-muted-foreground">
            {t("none")}{" "}
            <Link className="text-pink-text underline" href="/plus">
              {t("browse")}
            </Link>
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rentable.map((item) => (
              <li
                className="flex flex-wrap items-center gap-3 p-3"
                key={item.product_id}
              >
                <span className="min-w-0 flex-1 truncate">
                  {item.product ? localized(item.product, "name", locale) : ""}
                </span>
                {pending.has(item.product_id) ? (
                  <span className="text-muted-foreground text-xs">
                    {t("asked")}
                  </span>
                ) : (
                  <Button
                    disabled={ask.isPending}
                    onClick={() => ask.mutate(item.product_id)}
                    size="sm"
                    variant="outline"
                  >
                    {t("ask")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {asks.some((item) => item.status !== "pending") ? (
          <ul className="grid gap-1 text-muted-foreground text-xs">
            {asks
              .filter((item) => item.status !== "pending")
              .slice(0, 5)
              .map((item) => (
                <li key={item.id}>
                  {t(item.status === "approved" ? "approved" : "declined", {
                    item: item.product
                      ? localized(item.product, "name", locale)
                      : "",
                  })}
                </li>
              ))}
          </ul>
        ) : null}
        <FamilyError error={ask.error} />
      </CardContent>
    </Card>
  );
};

/**
 * `/pass/family`: one household on one Plus plan. For an adult: the
 * plan's shared slots, the people (you as the manager, your partner, your
 * teens and kids), requests to approve and "Add someone". For a teen: the
 * guardian link and "Ask to play".
 */
export const Family = () => {
  const t = useTranslations("app.pass.family");
  const guardian = useMyGuardian();
  const minor = guardian.data?.minor === true;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-8">
        <p className="text-muted-foreground">
          {minor ? t("teenDescription") : t("description")}
        </p>
        {guardian.isPending ? <SectionSpinner /> : null}
        {minor ? (
          <>
            <GuardianCard />
            <AskToPlay />
          </>
        ) : null}
        {guardian.data && !minor ? (
          <>
            <Requests />
            <SharedSlots />
            <People />
            <AddSomeone />
          </>
        ) : null}
      </div>
    </>
  );
};
