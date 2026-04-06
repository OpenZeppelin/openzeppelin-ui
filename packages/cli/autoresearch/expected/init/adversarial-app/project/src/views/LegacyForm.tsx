export function LegacyForm() {
  return (
    <form>
      <label htmlFor="name">Name</label>
      <input id="name" type="text" />
      <textarea placeholder="Bio" />
      <select>
        <option>Pick one</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  );
}
