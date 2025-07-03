import { supabase } from "./supabase";

export async function postData(data: any, table_name: any) {
  const { data: insertedData, error } = await supabase
    .from(`${table_name}`)
    .insert([data])
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  return insertedData;
}
