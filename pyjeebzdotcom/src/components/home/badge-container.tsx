import Image from "next/image";

export function BadgeContainer() {
  return (
    <div className="max-w-xl mx-auto my-4 px-4 home-page-content flex justify-center pb-8 mt-12 w-full">
      <Image
        src="/badges/animated-signature.svg"
        alt="Mujeeb Lawal-Saka Signature"
        width={300}
        height={200}
        className="w-full max-w-[300px] h-auto"
      />
    </div>
  );
}
