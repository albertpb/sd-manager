export default function ExifJson({
  exifParams,
}: {
  exifParams: Record<string, any> | null;
}) {
  if (exifParams === null) return null;

  return (
    <div className="max-w-full">
      <div>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(JSON.parse(exifParams?.prompt), null, 2)}
        </pre>
      </div>
      <div>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(JSON.parse(exifParams?.workflow), null, 2)}
        </pre>
      </div>
    </div>
  );
}
